import { generateText, Output } from "ai"
import { z } from "zod"
import { db } from "@/lib/db"
import { intakeRequests } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/session"
import { getAiModel, getAiSettings, buildSystemPrompt, aiEnabledForRole } from "@/lib/ai-config"
import { intakeFieldsForType, CASE_TYPES, CASE_PRIORITIES } from "@/lib/constants"
import { fetchRelevantLaws, formatLawsForPrompt, chargeCodesForCaseType } from "@/lib/law-library"
import type { IntakeEvidenceLink } from "@/lib/portal"

export const maxDuration = 60

const INTAKE_REVIEW_SYSTEM = `You are an intake screening attorney for a law office. You review prospective client requests and assess legal merit, the likely practice area, and what is missing before the office can act. Be candid and practical. You are not giving legal advice to the client; you are advising the office on whether and how to take the matter.`

const schema = z.object({
  recommendation: z
    .enum(["accept", "decline", "needs_info"])
    .describe("Overall recommendation for the office"),
  meritScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Legal merit / viability of the matter, 0 (no merit) to 100 (very strong)"),
  summary: z.string().describe("A 2-4 sentence plain-language assessment for staff"),
  caseType: z.string().describe("Best-fit practice area / case type for this matter"),
  suggestedPriority: z
    .string()
    .describe("Suggested priority given urgency and deadlines (e.g. low, normal, high, urgent)"),
  legalIssues: z.array(z.string()).describe("Key legal issues or claims involved"),
  missingInfo: z
    .array(z.string())
    .describe("Important facts or documents missing before the office can proceed"),
  redFlags: z
    .array(z.string())
    .describe("Conflicts, deadline risks, jurisdiction problems, or other concerns"),
  suggestedNextSteps: z.array(z.string()).describe("Concrete next steps for the office"),
})

function buildIntakeContext(row: typeof intakeRequests.$inferSelect): string {
  const data = (row.data ?? {}) as Record<string, unknown>
  const fields = intakeFieldsForType(row.type)
  const lines: string[] = [
    `Request type: ${row.type === "criminal" ? "Criminal charge defense" : "Civil lawsuit"}`,
    `Client-stated urgency: ${row.urgency}`,
    `Subject: ${row.subject}`,
    "",
    "Client answers:",
  ]
  for (const f of fields) {
    const v = data[f.key]
    if (v == null || v === "") continue
    lines.push(`- ${f.label}: ${String(v)}`)
  }
  const links = (row.evidence ?? []) as IntakeEvidenceLink[]
  if (links.length) {
    lines.push("", "Evidence / documents the client provided:")
    for (const l of links) {
      lines.push(`- ${l.title} (${l.type})${l.summary ? `: ${l.summary}` : ""}`)
    }
  }
  return lines.join("\n")
}

export async function POST(req: Request) {
  const current = await getCurrentUser()
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (
    !current.permissions.includes("intake:review") ||
    !current.permissions.includes("ai:use") ||
    !(await aiEnabledForRole(current.role))
  ) {
    return Response.json({ error: "Not permitted" }, { status: 403 })
  }

  const { intakeId } = (await req.json()) as { intakeId: string }
  const [row] = await db
    .select()
    .from(intakeRequests)
    .where(eq(intakeRequests.id, intakeId))
    .limit(1)
  if (!row) return Response.json({ error: "Intake not found" }, { status: 404 })

  const [model, ai] = await Promise.all([getAiModel(), getAiSettings()])
  const caseTypeOptions = CASE_TYPES.map((c) => c.label).join(", ")
  const priorityOptions = CASE_PRIORITIES.map((p) => p.label).join(", ")
  const system = await buildSystemPrompt(INTAKE_REVIEW_SYSTEM, {
    persona: ai.attorneyPersonality,
    rules: [
      ai.analyzerRules,
      `When choosing a case type, prefer one of: ${caseTypeOptions}.`,
      `When choosing a priority, use one of: ${priorityOptions}.`,
    ],
  })

  // Fetch relevant laws from the library based on case type
  const chargeCodesForType = chargeCodesForCaseType(row.type)
  const relevantLaws = await fetchRelevantLaws(chargeCodesForType, [], 3)
  const lawsContext = formatLawsForPrompt(relevantLaws)

  const { experimental_output } = await generateText({
    model,
    system,
    prompt: `Screen this prospective client intake and produce an office assessment.\n\n${buildIntakeContext(row)}${lawsContext}`,
    experimental_output: Output.object({ schema }),
  })

  return Response.json(experimental_output)
}
