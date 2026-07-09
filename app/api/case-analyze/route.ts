import { generateText, Output } from "ai"
import { z } from "zod"
import { CASE_ANALYST_SYSTEM } from "@/lib/prompts"
import { buildCaseContext } from "@/lib/case-context"
import { getCurrentUser } from "@/lib/session"
import { getAiModel, getAiSettings, buildSystemPrompt, aiEnabledForRole } from "@/lib/ai-config"

export const maxDuration = 60

const schema = z.object({
  strengthScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Defense position strength, 0 (very weak) to 100 (very strong)"),
  summary: z.string().describe("A 2-4 sentence overall strategic assessment"),
  probableCause: z.object({
    established: z
      .boolean()
      .describe("Whether probable cause appears legally established"),
    explanation: z.string().describe("Why probable cause is or isn't established"),
  }),
  contradictions: z
    .array(z.string())
    .describe("Contradictions or inconsistencies in the prosecution narrative"),
  weaknesses: z
    .array(z.string())
    .describe("Weaknesses in the case against the client"),
  strengths: z
    .array(z.string())
    .describe("Strengths the defense can leverage"),
  recommendedStrategy: z
    .string()
    .describe("A concrete recommended defense strategy"),
  likelyOutcomes: z
    .array(
      z.object({
        outcome: z.string().describe("A possible case outcome"),
        likelihood: z
          .string()
          .describe("Rough likelihood, e.g. 'High', 'Moderate', 'Low'"),
      }),
    )
    .describe("Likely outcomes with rough likelihoods"),
})

export async function POST(req: Request) {
  const current = await getCurrentUser()
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (!current.permissions.includes("ai:use") || !(await aiEnabledForRole(current.role))) {
    return Response.json({ error: "Not permitted" }, { status: 403 })
  }

  const { caseId } = (await req.json()) as { caseId: string }
  const context = await buildCaseContext(caseId)
  if (!context) return Response.json({ error: "Case not found" }, { status: 404 })

  const [model, ai] = await Promise.all([getAiModel(), getAiSettings()])
  const system = await buildSystemPrompt(CASE_ANALYST_SYSTEM, {
    persona: ai.attorneyPersonality,
    rules: [
      ai.analyzerRules,
      ai.scoringRules,
      `Treat a strength score at or above ${ai.passThreshold} as a strong defense position.`,
    ],
  })

  const { experimental_output } = await generateText({
    model,
    system,
    prompt: `Analyze this case and produce a defense strategy assessment.\n\n${context}`,
    experimental_output: Output.object({ schema }),
  })

  return Response.json(experimental_output)
}
