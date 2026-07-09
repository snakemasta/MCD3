import { generateText, Output } from "ai"
import { z } from "zod"
import { ANALYZER_SYSTEM } from "@/lib/prompts"
import { getAiModel, getAiSettings, buildSystemPrompt } from "@/lib/ai-config"
import { getCurrentUserSafe } from "@/lib/session"

export const maxDuration = 60

const schema = z.object({
  verdict: z
    .enum(["PASS", "FAIL"])
    .describe("Overall result: PASS if legally sufficient, otherwise FAIL"),
  summary: z.string().describe("A 2-3 sentence overall assessment"),
  probableCause: z
    .string()
    .describe("Assessment of whether probable cause is established and why"),
  timelineConsistent: z
    .boolean()
    .describe("Whether the report's timeline is internally consistent"),
  timelineNotes: z
    .string()
    .describe("Notes on any timeline gaps, conflicts, or confirmations"),
  missingElements: z
    .array(z.string())
    .describe("Missing required elements of the alleged offense(s)"),
  weakEvidence: z
    .array(z.string())
    .describe("Pieces of weak, thin, or insufficient evidence"),
  unsupportedConclusions: z
    .array(z.string())
    .describe("Conclusions or assumptions not supported by stated facts"),
  strengths: z
    .array(z.string())
    .describe("Strengths that support the report's sufficiency"),
  weaknesses: z
    .array(z.string())
    .describe("Overall weaknesses that undermine the report"),
})

export async function POST(req: Request) {
  // AI endpoints consume model credits — require an authenticated, active user.
  const current = await getCurrentUserSafe()
  if (!current || current.disabled) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { report } = (await req.json()) as { report: string }

  if (!report || report.trim().length < 20) {
    return Response.json(
      { error: "Please paste a longer police report to analyze." },
      { status: 400 },
    )
  }

  const [model, ai] = await Promise.all([getAiModel(), getAiSettings()])
  const system = await buildSystemPrompt(ANALYZER_SYSTEM, {
    rules: [ai.analyzerRules, ai.scoringRules],
  })

  const { experimental_output } = await generateText({
    model,
    system,
    prompt: `Analyze the following police report:\n\n"""\n${report}\n"""`,
    experimental_output: Output.object({ schema }),
  })

  return Response.json(experimental_output)
}
