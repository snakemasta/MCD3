import { convertToModelMessages, streamText, type UIMessage } from "ai"
import { CASE_CHAT_SYSTEM } from "@/lib/prompts"
import { buildCaseContext } from "@/lib/case-context"
import { getCurrentUser } from "@/lib/session"
import { getAiModel, getAiSettings, buildSystemPrompt, aiEnabledForRole } from "@/lib/ai-config"

export const maxDuration = 60

export async function POST(req: Request) {
  const current = await getCurrentUser()
  if (!current) return new Response("Unauthorized", { status: 401 })
  if (!current.permissions.includes("ai:use") || !(await aiEnabledForRole(current.role))) {
    return new Response("Not permitted", { status: 403 })
  }

  const { messages, caseId } = (await req.json()) as {
    messages: UIMessage[]
    caseId: string
  }

  const context = await buildCaseContext(caseId)
  if (!context) return new Response("Case not found", { status: 404 })

  const [model, ai] = await Promise.all([getAiModel(), getAiSettings()])
  const system = await buildSystemPrompt(`${CASE_CHAT_SYSTEM}\n\n${context}`, {
    persona: ai.attorneyPersonality,
  })

  const result = streamText({
    model,
    system,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
