import { generateText, Output } from "ai"
import { z } from "zod"
import { PLAN_SYSTEM } from "@/lib/prompts"
import { buildCaseContext } from "@/lib/case-context"
import { getCurrentUser } from "@/lib/session"
import { getAiModel, getAiSettings, buildSystemPrompt, aiEnabledForRole } from "@/lib/ai-config"

export const maxDuration = 60

const schema = z.object({
  items: z
    .array(
      z.object({
        content: z.string().describe("A single, clear, actionable task"),
        category: z
          .enum(["next_step", "motion", "discovery", "investigation", "deadline"])
          .describe("The category of this task"),
      }),
    )
    .describe("A focused list of case plan items"),
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
  const system = await buildSystemPrompt(PLAN_SYSTEM, {
    persona: ai.attorneyPersonality,
  })

  const { experimental_output } = await generateText({
    model,
    system,
    prompt: `Generate a defense case plan for this case.\n\n${context}`,
    experimental_output: Output.object({ schema }),
  })

  return Response.json(experimental_output)
}
