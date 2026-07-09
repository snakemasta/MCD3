import { generateText, Output } from "ai"
import { z } from "zod"
import { db } from "@/lib/db"
import { warrantAiReviews } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"
import { getAiModel, getAiSettings, buildSystemPrompt, aiEnabledForRole } from "@/lib/ai-config"
import { getSettings } from "@/lib/settings"
import { getWarrant, buildWarrantContext } from "@/lib/warrants"
import { WARRANT_ANALYST_SYSTEM, WARRANT_AUDIENCE_GUIDANCE } from "@/lib/prompts"
import { verdictFromScore } from "@/lib/warrant-utils"
import { retrieveKnowledge, citationInstruction } from "@/lib/ai-retrieval"

export const maxDuration = 60

const AUDIENCES = ["law_enforcement", "judge", "state_attorney", "defense"] as const
type Audience = (typeof AUDIENCES)[number]

const schema = z.object({
  summary: z.string().describe("A concise 2-4 sentence summary of the warrant request and overall assessment"),
  completenessScore: z.number().min(0).max(100).describe("How complete the warrant application is (0-100)"),
  probableCauseScore: z.number().min(0).max(100).describe("Strength of the probable cause (0-100)"),
  evidenceScore: z.number().min(0).max(100).describe("How well evidence supports the request (0-100)"),
  timelineScore: z.number().min(0).max(100).describe("Internal timeline consistency (0-100)"),
  rejectionRiskScore: z.number().min(0).max(100).describe("Risk that a judge rejects this warrant (0=low risk, 100=high risk)"),
  supportingFacts: z.array(z.string()).describe("Key facts that support the warrant"),
  missingComponents: z.array(z.string()).describe("Missing key components, facts, dates, locations, or evidence"),
  recommendedFixes: z.array(z.string()).describe("Concrete recommended fixes to strengthen the request"),
  suggestedQuestions: z.array(z.string()).describe("Suggested clarifying questions (for Needs More Info / review)"),
  considerations: z.array(z.string()).describe("Audience-specific considerations: approval/denial points, charging recommendations, or defense challenge issues"),
  probableCauseRewrite: z.string().describe("A cleaner rewritten probable cause summary, or empty string if not enough information"),
  citedSources: z.array(z.number()).describe("The [numbers] of any retrieved knowledge sources actually relied upon"),
})

export async function POST(req: Request) {
  const current = await getCurrentUser()
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (!current.permissions.includes("warrant:ai") || !(await aiEnabledForRole(current.role))) {
    return Response.json({ error: "Not permitted" }, { status: 403 })
  }

  const { warrantId, audience: rawAudience } = (await req.json()) as {
    warrantId: string
    audience?: string
  }
  const audience: Audience = AUDIENCES.includes(rawAudience as Audience)
    ? (rawAudience as Audience)
    : "law_enforcement"

  const warrant = await getWarrant(warrantId)
  if (!warrant) return Response.json({ error: "Warrant not found" }, { status: 404 })

  const [model, ai, context, warrantSettings] = await Promise.all([
    getAiModel(),
    getAiSettings(),
    buildWarrantContext(warrant),
    getSettings("warrant"),
  ])

  // Retrieve supporting knowledge (Memory Bank + Penal Code / SOP Bank) for grounding.
  const retrievalQuery = [warrant.title, warrant.warrantType, warrant.probableCause, warrant.requestedCharges]
    .filter(Boolean)
    .join(" ")
  const [retrieval, citeRule] = await Promise.all([
    retrieveKnowledge(retrievalQuery),
    citationInstruction(),
  ])

  const system = await buildSystemPrompt(WARRANT_ANALYST_SYSTEM, {
    persona: ai.attorneyPersonality,
    rules: [WARRANT_AUDIENCE_GUIDANCE[audience], ai.scoringRules, citeRule].filter(Boolean),
  })

  const { experimental_output } = await generateText({
    model,
    system,
    prompt: `Review this warrant request and produce a structured assessment.\n\n${context}${retrieval.context}`,
    experimental_output: Output.object({ schema }),
  })

  const result = experimental_output
  // Overall strength blends positive dimensions with inverted rejection risk.
  const strength = Math.round(
    (result.completenessScore +
      result.probableCauseScore +
      result.evidenceScore +
      result.timelineScore +
      (100 - result.rejectionRiskScore)) /
      5,
  )
  const verdict = verdictFromScore(strength, warrantSettings.scoringThresholds)

  // Map cited source numbers back to the retrieved entries for display.
  const citedSources = (result.citedSources ?? [])
    .map((n) => retrieval.sources[n - 1])
    .filter(Boolean)
    .map((s) => ({ id: s.id, title: s.title, kind: s.kind, codeSection: s.codeSection }))

  await db.insert(warrantAiReviews).values({
    warrantId,
    audience,
    verdict,
    completenessScore: result.completenessScore,
    probableCauseScore: result.probableCauseScore,
    evidenceScore: result.evidenceScore,
    timelineScore: result.timelineScore,
    rejectionRiskScore: result.rejectionRiskScore,
    result: { ...result, citedSources, retrievedSources: retrieval.sources },
    generatedById: current.id,
  })

  return Response.json({ ...result, citedSources, retrievedSources: retrieval.sources, verdict, strength, audience })
}
