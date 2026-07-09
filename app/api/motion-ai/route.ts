import { generateText, Output } from "ai"
import { z } from "zod"
import { db } from "@/lib/db"
import { motionAiReviews } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"
import { getAiModel, getAiSettings, buildSystemPrompt, aiEnabledForRole } from "@/lib/ai-config"
import { getMotion, buildMotionContext } from "@/lib/motions"
import { MOTION_ANALYST_SYSTEM, MOTION_AUDIENCE_GUIDANCE } from "@/lib/prompts"
import { motionVerdictFromScore } from "@/lib/motion-utils"
import { getSettings } from "@/lib/settings"
import { retrieveKnowledge, citationInstruction } from "@/lib/ai-retrieval"

export const maxDuration = 60

const AUDIENCES = ["filer", "judge", "opposing"] as const
type Audience = (typeof AUDIENCES)[number]

const schema = z.object({
  summary: z.string().describe("A concise 2-4 sentence summary of the motion and overall assessment"),
  meritScore: z.number().min(0).max(100).describe("Legal merit of the motion (0-100)"),
  authoritySupportScore: z.number().min(0).max(100).describe("Strength/relevance of cited authorities (0-100)"),
  clarityScore: z.number().min(0).max(100).describe("Clarity of the argument and requested relief (0-100)"),
  grantLikelihoodScore: z.number().min(0).max(100).describe("Likelihood a judge grants the motion (0-100)"),
  supportingPoints: z.array(z.string()).describe("Key points that support granting the motion"),
  weaknesses: z.array(z.string()).describe("Weaknesses, missing elements, or unsupported assertions"),
  recommendedFixes: z.array(z.string()).describe("Concrete recommended improvements to strengthen the motion"),
  suggestedAuthorities: z.array(z.string()).describe("Suggested statutes, rules, or case law to cite or verify"),
  opposingArguments: z.array(z.string()).describe("Anticipated counterarguments from the opposing party"),
  considerations: z.array(z.string()).describe("Audience-specific considerations (grant/deny points, opposition strategy, or filer fixes)"),
  citedSources: z.array(z.number()).describe("The [numbers] of any retrieved knowledge sources actually relied upon"),
})

export async function POST(req: Request) {
  const current = await getCurrentUser()
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (!current.permissions.includes("motion:ai") || !(await aiEnabledForRole(current.role))) {
    return Response.json({ error: "Not permitted" }, { status: 403 })
  }

  const { motionId, audience: rawAudience } = (await req.json()) as {
    motionId: string
    audience?: string
  }
  const audience: Audience = AUDIENCES.includes(rawAudience as Audience)
    ? (rawAudience as Audience)
    : "filer"

  const motion = await getMotion(motionId)
  if (!motion) return Response.json({ error: "Motion not found" }, { status: 404 })

  const [model, ai, context, motionSettings] = await Promise.all([
    getAiModel(),
    getAiSettings(),
    buildMotionContext(motion),
    getSettings("motion"),
  ])

  // Retrieve supporting knowledge (Memory Bank + Penal Code / SOP Bank) for grounding.
  const retrievalQuery = [motion.title, motion.relief, motion.argument, motion.authoritiesCited]
    .filter(Boolean)
    .join(" ")
  const [retrieval, citeRule] = await Promise.all([
    retrieveKnowledge(retrievalQuery),
    citationInstruction(),
  ])

  const system = await buildSystemPrompt(MOTION_ANALYST_SYSTEM, {
    persona: ai.attorneyPersonality,
    rules: [MOTION_AUDIENCE_GUIDANCE[audience], ai.scoringRules, citeRule].filter(Boolean),
  })

  const { experimental_output } = await generateText({
    model,
    system,
    prompt: `Review this motion and produce a structured assessment.\n\n${context}${retrieval.context}`,
    experimental_output: Output.object({ schema }),
  })

  const result = experimental_output
  const merit = Math.round(
    (result.meritScore +
      result.authoritySupportScore +
      result.clarityScore +
      result.grantLikelihoodScore) /
      4,
  )
  const verdict = motionVerdictFromScore(merit, motionSettings.scoringThresholds)

  // Map cited source numbers back to the retrieved entries for display.
  const citedSources = (result.citedSources ?? [])
    .map((n) => retrieval.sources[n - 1])
    .filter(Boolean)
    .map((s) => ({ id: s.id, title: s.title, kind: s.kind, codeSection: s.codeSection }))

  await db.insert(motionAiReviews).values({
    motionId,
    audience,
    verdict,
    meritScore: result.meritScore,
    authoritySupportScore: result.authoritySupportScore,
    clarityScore: result.clarityScore,
    grantLikelihoodScore: result.grantLikelihoodScore,
    result: { ...result, citedSources, retrievedSources: retrieval.sources },
    generatedById: current.id,
  })

  return Response.json({
    ...result,
    citedSources,
    retrievedSources: retrieval.sources,
    verdict,
    merit,
    audience,
  })
}
