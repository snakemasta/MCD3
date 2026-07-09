import { generateText, Output } from "ai"
import { z } from "zod"
import { CASE_ANALYST_PROSECUTION_SYSTEM } from "@/lib/prompts"
import { getCurrentUserSafe } from "@/lib/session"
import { loadProsecutionCaseFile } from "@/lib/prosecution-case-file"
import { getAiModel, getAiSettings, buildSystemPrompt, aiEnabledForRole } from "@/lib/ai-config"

export const maxDuration = 60

const schema = z.object({
  caseStrengthScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Strength of the case FOR the prosecution, 0 (very weak) to 100 (very strong)"),
  summary: z.string().describe("A 2-4 sentence overall prosecutorial assessment"),
  probableCause: z.object({
    sufficient: z.boolean().describe("Whether probable cause appears legally sufficient"),
    explanation: z.string().describe("Why probable cause is or isn't sufficient"),
  }),
  chargeElements: z
    .array(
      z.object({
        charge: z.string().describe("The charge / statute"),
        status: z.string().describe("e.g. 'satisfied', 'at risk', 'unsupported'"),
        analysis: z.string().describe("Element-by-element analysis of this charge"),
      }),
    )
    .describe("Analysis of the elements of each charge"),
  missingEvidence: z.array(z.string()).describe("Evidence that is missing or needed to strengthen the case"),
  discoveryRisks: z.array(z.string()).describe("Discovery and disclosure (e.g. Brady) risks"),
  likelyDefenseArguments: z.array(z.string()).describe("Arguments the defense is likely to raise"),
  strongerCharges: z.array(z.string()).describe("Stronger or additional charges to consider"),
  lesserIncludedCharges: z.array(z.string()).describe("Lesser included charges to consider"),
  evidenceRequests: z.array(z.string()).describe("Specific evidence to request from law enforcement"),
  witnessQuestions: z.array(z.string()).describe("Key questions to ask witnesses"),
  pleaOptions: z.array(z.string()).describe("Reasonable plea options to consider"),
  warrantStrength: z.string().describe("Assessment of any related warrant's strength"),
  policeReportStrength: z.string().describe("Assessment of any related police report's strength"),
  dismissalRisks: z.array(z.string()).describe("Risks that could lead to dismissal"),
  recommendedNextSteps: z.array(z.string()).describe("Concrete next prosecution steps"),
})

export async function POST(req: Request) {
  const current = await getCurrentUserSafe()
  if (!current || !current.interfaces.includes("prosecution")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!current.permissions.includes("prosecution:ai") || !(await aiEnabledForRole(current.role))) {
    return Response.json({ error: "Not permitted" }, { status: 403 })
  }

  const { caseId } = (await req.json()) as { caseId: string }
  // Loading via the prosecution policy guarantees we never feed private
  // defense notes or defense AI output into the model.
  const file = await loadProsecutionCaseFile(current, caseId)
  if (!file || !file.access.canView) {
    return Response.json({ error: "Case not found" }, { status: 404 })
  }

  const context = buildContext(file)

  const [model, ai] = await Promise.all([getAiModel(), getAiSettings()])
  const system = await buildSystemPrompt(CASE_ANALYST_PROSECUTION_SYSTEM, {
    rules: [
      ai.analyzerRules,
      ai.scoringRules,
      `Treat a case strength score at or above ${ai.passThreshold} as a strong prosecution position.`,
    ],
  })

  const { experimental_output } = await generateText({
    model,
    system,
    prompt: `Analyze this case and produce a prosecution strategy assessment.\n\n${context}`,
    experimental_output: Output.object({ schema }),
  })

  return Response.json(experimental_output)
}

function buildContext(file: Awaited<ReturnType<typeof loadProsecutionCaseFile>>): string {
  if (!file) return ""
  const c = file.caseItem
  const charges =
    file.charges.length > 0
      ? file.charges.map((ch, i) => `  ${i + 1}. ${ch.statute} [${ch.severity}/${ch.status}]${ch.description ? ` - ${ch.description}` : ""}`).join("\n")
      : c.charges || "  (none recorded)"
  const evidence =
    file.evidence.length > 0
      ? file.evidence.map((e, i) => `  ${i + 1}. [${e.evidenceType}] ${e.title} (${e.status})${e.description ? ` - ${e.description}` : ""}`).join("\n")
      : "  (none shared)"
  const timeline =
    file.timeline.length > 0
      ? file.timeline.map((t) => `  - ${new Date(t.date).toISOString().slice(0, 10)} [${t.eventType}] ${t.title}${t.description ? `: ${t.description}` : ""}`).join("\n")
      : "  (none recorded)"
  const reports =
    file.policeReports.length > 0
      ? file.policeReports.map((r) => `  - ${r.reportNumber}: ${r.title} (${r.status}) — Charges: ${r.proposedCharges || "n/a"}\n    PC: ${r.probableCause || "n/a"}\n    Narrative: ${r.narrative || "n/a"}`).join("\n")
      : "  (none linked)"
  const warrants =
    file.warrants.length > 0
      ? file.warrants.map((w) => `  - ${w.warrantNumber}: ${w.title} [${w.warrantType}/${w.status}] — PC: ${w.probableCause || "n/a"}`).join("\n")
      : "  (none linked)"
  const witnesses =
    file.witnesses.length > 0
      ? file.witnesses.map((w) => `  - ${w.name} (${w.role})${w.notes ? `: ${w.notes}` : ""}`).join("\n")
      : "  (none listed)"

  return `CASE FILE (PROSECUTION VIEW)
Title: ${c.title}
Case Number: ${c.caseNumber}
Defendant: ${c.defendantName || c.clientName || "Unknown"}
Type: ${c.caseType} | Status: ${c.status} | Priority: ${c.priority}
Arresting Agency: ${c.arrestingAgency || "Unknown"}
Probable Cause: ${c.probableCause || "(not specified)"}
Incident Narrative: ${c.incidentNarrative || "(not specified)"}

CHARGES:
${charges}

EVIDENCE:
${evidence}

POLICE REPORTS:
${reports}

WARRANTS:
${warrants}

WITNESSES:
${witnesses}

TIMELINE:
${timeline}`
}
