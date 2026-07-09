import { convertToModelMessages, streamText, type UIMessage } from "ai"
import { SYSTEM_PROMPTS } from "@/lib/prompts"
import type { Mode } from "@/lib/types"
import { getAiModel, getAiSettings, buildSystemPrompt } from "@/lib/ai-config"
import { getCurrentUserSafe } from "@/lib/session"

export const maxDuration = 30

export async function POST(req: Request) {
  // AI endpoints consume model credits — require an authenticated, active user.
  const current = await getCurrentUserSafe()
  if (!current || current.disabled) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { messages, mode } = (await req.json()) as {
    messages: UIMessage[]
    mode: Mode
  }

  const [model, ai] = await Promise.all([getAiModel(), getAiSettings()])

  const system =
    mode === "attorney"
      ? await buildSystemPrompt(SYSTEM_PROMPTS.attorney, {
          persona: ai.attorneyPersonality,
        })
      : await buildSystemPrompt(SYSTEM_PROMPTS.general, {
          persona: ai.generalPrompt,
        })

  const result = streamText({
    model,
    system,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
