import { WARRANT_STATUSES, WARRANT_TYPES, WARRANT_RISK_LEVELS } from "@/lib/constants"

/** Evidence link shape stored on warrants/closeouts. */
export interface EvidenceLink {
  label: string
  url: string
}

/** A minimal warrant shape covering the fields the UI/AI rely on. */
export interface WarrantLike {
  id?: string
  warrantNumber?: string
  title?: string | null
  warrantType?: string | null
  suspectName?: string | null
  dateOfBirth?: string | null
  agency?: string | null
  requestingOfficerName?: string | null
  requestedCharges?: string | null
  probableCause?: string | null
  incidentSummary?: string | null
  incidentDate?: Date | string | null
  location?: string | null
  itemsSought?: string | null
  riskLevel?: string | null
  evidenceLinks?: EvidenceLink[] | unknown | null
  evidenceSummaries?: string | null
  relatedPoliceReportId?: string | null
  notesToJudge?: string | null
  judgeNotes?: string | null
  status?: string | null
}

export interface ChecklistItem {
  key: string
  label: string
  /** Whether this item is satisfied by the current warrant. */
  done: boolean
  /** "le" items are the officer's responsibility; "judge" items are the court's. */
  audience: "le" | "judge"
}

function hasText(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0
}

/** Compute the warrant completeness checklist. Pure + client-safe. */
export function computeChecklist(w: WarrantLike): ChecklistItem[] {
  const links = Array.isArray(w.evidenceLinks) ? w.evidenceLinks : []
  const nexusText = `${w.probableCause ?? ""} ${w.incidentSummary ?? ""} ${w.notesToJudge ?? ""}`.toLowerCase()
  // A rough heuristic: a nexus is "explained" when the narrative connects the
  // suspect/location/items to the offense. We look for connective language.
  const nexusExplained =
    hasText(w.probableCause) &&
    (nexusText.includes("because") ||
      nexusText.includes("connect") ||
      nexusText.includes("linked") ||
      nexusText.includes("nexus") ||
      nexusText.includes("located at") ||
      nexusText.length > 280)

  return [
    { key: "suspect", label: "Suspect identified", done: hasText(w.suspectName), audience: "le" },
    { key: "officer", label: "Requesting officer identified", done: hasText(w.requestingOfficerName), audience: "le" },
    { key: "agency", label: "Agency identified", done: hasText(w.agency), audience: "le" },
    { key: "type", label: "Warrant type selected", done: hasText(w.warrantType), audience: "le" },
    { key: "charges", label: "Charges listed", done: hasText(w.requestedCharges), audience: "le" },
    { key: "probableCause", label: "Probable cause included", done: hasText(w.probableCause), audience: "le" },
    { key: "incidentDate", label: "Incident date/time included", done: Boolean(w.incidentDate), audience: "le" },
    { key: "location", label: "Location included", done: hasText(w.location), audience: "le" },
    { key: "itemsSought", label: "Items/persons sought included", done: hasText(w.itemsSought), audience: "le" },
    { key: "evidenceLinks", label: "Evidence links included", done: links.length > 0, audience: "le" },
    { key: "evidenceSummaries", label: "Evidence summaries included", done: hasText(w.evidenceSummaries), audience: "le" },
    { key: "policeReport", label: "Related police report linked", done: hasText(w.relatedPoliceReportId), audience: "le" },
    { key: "nexus", label: "Nexus explained", done: nexusExplained, audience: "le" },
    { key: "judgeReview", label: "Judge review fields completed", done: hasText(w.judgeNotes), audience: "judge" },
  ]
}

/** Percentage (0-100) of LE-owned checklist items completed. */
export function checklistCompletion(items: ChecklistItem[], audience: "le" | "all" = "le"): number {
  const scoped = audience === "all" ? items : items.filter((i) => i.audience === "le")
  if (scoped.length === 0) return 0
  const done = scoped.filter((i) => i.done).length
  return Math.round((done / scoped.length) * 100)
}

export function warrantTypeLabel(value?: string | null, custom: { value: string; label: string }[] = []): string {
  if (!value) return "—"
  const all = [...WARRANT_TYPES, ...custom]
  return all.find((t) => t.value === value)?.label ?? value
}

export function warrantStatusLabel(value?: string | null, overrides: Record<string, string> = {}): string {
  if (!value) return "—"
  if (overrides[value]) return overrides[value]
  return WARRANT_STATUSES.find((s) => s.value === value)?.label ?? value.replace(/_/g, " ")
}

export function riskLevelLabel(value?: string | null): string {
  if (!value) return "—"
  return WARRANT_RISK_LEVELS.find((r) => r.value === value)?.label ?? value
}

/** Verdict from a completeness/risk score given configured thresholds. */
export function verdictFromScore(
  score: number,
  thresholds: { pass: number; highRisk: number },
): "pass" | "needs_work" | "high_risk" {
  if (score >= thresholds.pass) return "pass"
  if (score <= thresholds.highRisk) return "high_risk"
  return "needs_work"
}

export const VERDICT_META: Record<string, { label: string; className: string }> = {
  pass: { label: "Pass", className: "bg-green-100 text-green-800" },
  needs_work: { label: "Needs Work", className: "bg-yellow-100 text-yellow-800" },
  high_risk: { label: "High Risk", className: "bg-red-100 text-red-800" },
}
