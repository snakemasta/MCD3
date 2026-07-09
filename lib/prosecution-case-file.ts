import "server-only"
import { and, desc, asc, eq, inArray, or } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  cases,
  prosecutionCharges,
  pleaOffers,
  witnessList,
  evidence,
  timelineEvents,
  filingDeadlines,
  drafts,
  warrants,
  leReports,
  lawLibrary,
  aiAnalyses,
  prosecutionAnalysis,
} from "@/lib/db/schema"
import type { CurrentUser } from "@/lib/session"
import {
  getProsecutionCaseAccess,
  type ProsecutionCaseAccess,
} from "@/lib/prosecution-access"
import type { CaseAnalysisResult } from "@/app/actions/analysis"
import type { ProsecutionAnalysisResult } from "@/app/actions/prosecution-analysis"

/** A fully assembled, policy-filtered prosecution view of a case. */
export interface ProsecutionCaseFile {
  access: ProsecutionCaseAccess
  caseItem: typeof cases.$inferSelect
  charges: (typeof prosecutionCharges.$inferSelect)[]
  pleas: (typeof pleaOffers.$inferSelect)[]
  witnesses: (typeof witnessList.$inferSelect)[]
  evidence: (typeof evidence.$inferSelect)[]
  timeline: (typeof timelineEvents.$inferSelect)[]
  deadlines: (typeof filingDeadlines.$inferSelect)[]
  motions: (typeof drafts.$inferSelect)[]
  warrants: (typeof warrants.$inferSelect)[]
  policeReports: (typeof leReports.$inferSelect)[]
  lawLinks: (typeof lawLibrary.$inferSelect)[]
  /** Investigation AI output — only present when an admin has shared it. */
  defenseAi: { id: string; createdAt: Date; result: CaseAnalysisResult } | null
  /** Latest Prosecution AI analysis for this case, if any. */
  prosecutionAi: { id: string; createdAt: Date; result: ProsecutionAnalysisResult } | null
}

/**
 * Load the prosecution-visible case file for a case. Returns null if the case
 * does not exist. Sections the prosecutor is not permitted to see are returned
 * empty — enforcement happens here on the server, never just in the UI.
 */
export async function loadProsecutionCaseFile(
  user: CurrentUser,
  caseId: string,
): Promise<ProsecutionCaseFile | null> {
  const [caseItem] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1)
  if (!caseItem) return null

  const access = await getProsecutionCaseAccess(user, {
    id: caseItem.id,
    side: caseItem.side,
    status: caseItem.status,
  })
  const s = access.sections

  const [charges, pleas, witnesses, motions, caseWarrants, prosecutionAi] = await Promise.all([
    s.charges
      ? db.select().from(prosecutionCharges).where(eq(prosecutionCharges.caseId, caseId))
      : Promise.resolve([]),
    s.charges
      ? db.select().from(pleaOffers).where(eq(pleaOffers.caseId, caseId))
      : Promise.resolve([]),
    s.overview
      ? db.select().from(witnessList).where(eq(witnessList.caseId, caseId))
      : Promise.resolve([]),
    s.motions
      ? db.select().from(drafts).where(eq(drafts.caseId, caseId)).orderBy(desc(drafts.updatedAt))
      : Promise.resolve([]),
    s.warrants
      ? db
          .select()
          .from(warrants)
          .where(
            or(
              eq(warrants.linkedDefenseCaseId, caseId),
              eq(warrants.linkedProsecutionCaseId, caseId),
            ),
          )
          .orderBy(desc(warrants.createdAt))
      : Promise.resolve([]),
    db
      .select()
      .from(prosecutionAnalysis)
      .where(eq(prosecutionAnalysis.caseId, caseId))
      .orderBy(desc(prosecutionAnalysis.createdAt))
      .limit(1),
  ])

  const caseEvidence = access.canViewEvidence
    ? await db.select().from(evidence).where(eq(evidence.caseId, caseId)).orderBy(desc(evidence.createdAt))
    : []

  const timeline =
    s.timeline || s.courtDates
      ? await db
          .select()
          .from(timelineEvents)
          .where(eq(timelineEvents.caseId, caseId))
          .orderBy(asc(timelineEvents.date))
      : []

  const deadlines = s.courtDates
    ? await db
        .select()
        .from(filingDeadlines)
        .where(eq(filingDeadlines.caseId, caseId))
        .orderBy(asc(filingDeadlines.dueDate))
    : []

  // Police reports: the originating report (if converted from one) plus any
  // reports referenced by evidence in the locker.
  let policeReports: (typeof leReports.$inferSelect)[] = []
  if (s.policeReports) {
    const reportIds = new Set<string>()
    if (caseItem.sourceReportId) reportIds.add(caseItem.sourceReportId)
    for (const e of caseEvidence) if (e.policeReportId) reportIds.add(e.policeReportId)
    const byConverted = await db
      .select()
      .from(leReports)
      .where(eq(leReports.convertedCaseId, caseId))
    for (const r of byConverted) reportIds.add(r.id)
    const allIds = [...reportIds]
    if (allIds.length) {
      policeReports = await db.select().from(leReports).where(inArray(leReports.id, allIds))
    }
  }

  // Law library links: statutes referenced by the case's charges.
  let lawLinks: (typeof lawLibrary.$inferSelect)[] = []
  if (s.lawLibrary) {
    const lawIds = charges.map((c) => c.lawLibraryId).filter((v): v is string => Boolean(v))
    if (lawIds.length) {
      lawLinks = await db.select().from(lawLibrary).where(inArray(lawLibrary.id, lawIds))
    }
  }

  // Investigation AI strategy output — private unless an admin has explicitly
  // granted prosecution AI visibility for this side/case.
  let defenseAi: ProsecutionCaseFile["defenseAi"] = null
  if (access.canViewDefenseAi) {
    const [latest] = await db
      .select()
      .from(aiAnalyses)
      .where(eq(aiAnalyses.caseId, caseId))
      .orderBy(desc(aiAnalyses.createdAt))
      .limit(1)
    if (latest) {
      defenseAi = {
        id: latest.id,
        createdAt: latest.createdAt,
        result: latest.result as CaseAnalysisResult,
      }
    }
  }

  return {
    access,
    caseItem,
    charges,
    pleas,
    witnesses,
    evidence: caseEvidence,
    timeline,
    deadlines,
    motions,
    warrants: caseWarrants,
    policeReports,
    lawLinks,
    defenseAi,
    prosecutionAi: prosecutionAi[0]
      ? {
          id: prosecutionAi[0].id,
          createdAt: prosecutionAi[0].createdAt,
          result: prosecutionAi[0].result as ProsecutionAnalysisResult,
        }
      : null,
  }
}
