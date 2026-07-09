import { generateText } from "ai"
import { DRAFT_SYSTEM } from "@/lib/prompts"
import { buildCaseContext } from "@/lib/case-context"
import { getCurrentUser } from "@/lib/session"
import { labelOf, DRAFT_TYPES } from "@/lib/constants"
import { getAiModel, getAiSettings, buildSystemPrompt, aiEnabledForRole } from "@/lib/ai-config"
import { retrieveKnowledge, citationInstruction } from "@/lib/ai-retrieval"

export const maxDuration = 60

export async function POST(req: Request) {
  const current = await getCurrentUser()
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (!current.permissions.includes("draft:manage") || !(await aiEnabledForRole(current.role))) {
    return Response.json({ error: "Not permitted" }, { status: 403 })
  }

  const { caseId, docType, instructions } = (await req.json()) as {
    caseId: string
    docType: string
    instructions?: string
  }

  const context = await buildCaseContext(caseId)
  if (!context) return Response.json({ error: "Case not found" }, { status: 404 })

  const [model, ai] = await Promise.all([getAiModel(), getAiSettings()])

  // Ground the draft in approved Penal Code / SOP Bank / Memory Bank authority.
  const [retrieval, citeRule] = await Promise.all([
    retrieveKnowledge([labelOf(DRAFT_TYPES, docType), instructions].filter(Boolean).join(" ")),
    citationInstruction(),
  ])

  const system = await buildSystemPrompt(DRAFT_SYSTEM, {
    persona: ai.attorneyPersonality,
    rules: [citeRule].filter(Boolean),
  })

  const { text } = await generateText({
    model,
    system,
    prompt: `Draft a ${labelOf(DRAFT_TYPES, docType)} for this case.${
      instructions ? `\n\nSpecific instructions: ${instructions}` : ""
    }\n\n${context}${retrieval.context}`,
  })

  return Response.json({ content: text, sources: retrieval.sources })
}
