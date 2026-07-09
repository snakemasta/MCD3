import "server-only"
import { and, desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  warrants,
  warrantHistory,
  warrantCloseouts,
  warrantAiReviews,
  leReports,
} from "@/lib/db/schema"
import { warrantStatusLabel, warrantTypeLabel, riskLevelLabel, type EvidenceLink } from "@/lib/warrant-utils"

export type WarrantRow = typeof warrants.$inferSelect
export type WarrantHistoryRow = typeof warrantHistory.$inferSelect
export type WarrantCloseoutRow = typeof warrantCloseouts.$inferSelect
export type WarrantAiReviewRow = typeof warrantAiReviews.$inferSelect

export interface WarrantFilters {
  status?: string
  warrantType?: string
  agency?: string
  officerId?: string
  judgeId?: string
  /** Restrict to a single requesting officer (for LE "my warrants" views). */
  scopeOfficerId?: string
  /** Only warrants linked to this prosecution/defense case. */
  caseId?: string
  /** Free text search on title/number/suspect. */
  q?: string
}

/** Generate a unique-ish warrant number. */
export function generateWarrantNumber(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `WR-${year}-${Date.now().toString().slice(-5)}${rand.toString().slice(-1)}`
}

/** List warrants with optional filtering. */
export async function listWarrants(filters: WarrantFilters = {}): Promise<WarrantRow[]> {
  const conds = []
  if (filters.status) conds.push(eq(warrants.status, filters.status))
  if (filters.warrantType) conds.push(eq(warrants.warrantType, filters.warrantType))
  if (filters.agency) conds.push(eq(warrants.agency, filters.agency))
  if (filters.officerId) conds.push(eq(warrants.requestingOfficerId, filters.officerId))
  if (filters.scopeOfficerId) conds.push(eq(warrants.requestingOfficerId, filters.scopeOfficerId))
  if (filters.judgeId) conds.push(eq(warrants.judgeId, filters.judgeId))
  if (filters.q) {
    const like = `%${filters.q.toLowerCase()}%`
    conds.push(
      sql`(lower(${warrants.title}) like ${like} or lower(${warrants.warrantNumber}) like ${like} or lower(coalesce(${warrants.suspectName}, '')) like ${like})`,
    )
  }
  if (filters.caseId) {
    conds.push(
      sql`(${warrants.linkedProsecutionCaseId} = ${filters.caseId} or ${warrants.linkedDefenseCaseId} = ${filters.caseId})`,
    )
  }

  const where = conds.length ? and(...conds) : undefined
  return db.select().from(warrants).where(where).orderBy(desc(warrants.createdAt))
}

/** Queue of warrants awaiting judicial action. */
export async function listJudgeQueue(): Promise<WarrantRow[]> {
  return db
    .select()
    .from(warrants)
    .where(
      sql`${warrants.status} in ('submitted', 'under_review', 'needs_more_info')`,
    )
    .orderBy(desc(warrants.createdAt))
}

export async function getWarrant(id: string): Promise<WarrantRow | null> {
  const [row] = await db.select().from(warrants).where(eq(warrants.id, id)).limit(1)
  return row ?? null
}

export async function getWarrantHistory(warrantId: string): Promise<WarrantHistoryRow[]> {
  return db
    .select()
    .from(warrantHistory)
    .where(eq(warrantHistory.warrantId, warrantId))
    .orderBy(desc(warrantHistory.createdAt))
}

export async function getWarrantCloseout(warrantId: string): Promise<WarrantCloseoutRow | null> {
  const [row] = await db
    .select()
    .from(warrantCloseouts)
    .where(eq(warrantCloseouts.warrantId, warrantId))
    .orderBy(desc(warrantCloseouts.createdAt))
    .limit(1)
  return row ?? null
}

/** Latest stored AI review for a warrant, optionally filtered by audience. */
export async function getLatestAiReview(
  warrantId: string,
  audience?: string,
): Promise<WarrantAiReviewRow | null> {
  const conds = [eq(warrantAiReviews.warrantId, warrantId)]
  if (audience) conds.push(eq(warrantAiReviews.audience, audience))
  const [row] = await db
    .select()
    .from(warrantAiReviews)
    .where(and(...conds))
    .orderBy(desc(warrantAiReviews.createdAt))
    .limit(1)
  return row ?? null
}

/** Distinct agencies/officers seen in warrants, for filter dropdowns. */
export async function getWarrantFilterOptions() {
  const rows = await db
    .select({
      agency: warrants.agency,
      officerId: warrants.requestingOfficerId,
      officerName: warrants.requestingOfficerName,
      judgeId: warrants.judgeId,
      judgeName: warrants.judgeName,
    })
    .from(warrants)
  const agencies = new Set<string>()
  const officers = new Map<string, string>()
  const judges = new Map<string, string>()
  for (const r of rows) {
    if (r.agency) agencies.add(r.agency)
    if (r.officerId) officers.set(r.officerId, r.officerName ?? r.officerId)
    if (r.judgeId) judges.set(r.judgeId, r.judgeName ?? r.judgeId)
  }
  return {
    agencies: [...agencies].sort(),
    officers: [...officers.entries()].map(([id, name]) => ({ id, name })),
    judges: [...judges.entries()].map(([id, name]) => ({ id, name })),
  }
}

/** Build a plain-text context string describing a warrant for the AI. */
export async function buildWarrantContext(w: WarrantRow): Promise<string> {
  const links = (Array.isArray(w.evidenceLinks) ? w.evidenceLinks : []) as EvidenceLink[]
  let reportText = ""
  if (w.relatedPoliceReportId) {
    const [report] = await db
      .select()
      .from(leReports)
      .where(eq(leReports.id, w.relatedPoliceReportId))
      .limit(1)
    if (report) {
      reportText = `\nLINKED POLICE REPORT #${report.reportNumber}: ${report.title}\nNarrative: ${report.narrative}\nProbable cause: ${report.probableCause ?? "—"}\nProposed charges: ${report.proposedCharges ?? "—"}`
    }
  }
  return [
    `WARRANT #${w.warrantNumber}: ${w.title}`,
    `Type: ${warrantTypeLabel(w.warrantType)}`,
    `Status: ${warrantStatusLabel(w.status)}`,
    `Risk level: ${riskLevelLabel(w.riskLevel)}`,
    `Suspect/Defendant: ${w.suspectName ?? "—"} (DOB: ${w.dateOfBirth ?? "—"})`,
    `Agency: ${w.agency ?? "—"}`,
    `Requesting officer: ${w.requestingOfficerName ?? "—"}`,
    `Requested charges: ${w.requestedCharges ?? "—"}`,
    `Incident date: ${w.incidentDate ? new Date(w.incidentDate).toLocaleString() : "—"}`,
    `Location to search/arrest: ${w.location ?? "—"}`,
    `Items or persons sought: ${w.itemsSought ?? "—"}`,
    `Probable cause statement:\n${w.probableCause ?? "—"}`,
    `Incident summary:\n${w.incidentSummary ?? "—"}`,
    `Evidence summaries:\n${w.evidenceSummaries ?? "—"}`,
    `Evidence links: ${links.length ? links.map((l) => `${l.label} (${l.url})`).join("; ") : "none"}`,
    `Notes to judge:\n${w.notesToJudge ?? "—"}`,
    w.judgeNotes ? `Judge notes:\n${w.judgeNotes}` : "",
    reportText,
  ]
    .filter(Boolean)
    .join("\n")
}
