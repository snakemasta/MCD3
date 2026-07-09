import "server-only"
import { and, asc, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  aiAnalyses,
  caseCivilianAccess,
  cases,
  civilianMessages,
  drafts,
  evidence,
  filingDeadlines,
  intakeRequests,
  user,
} from "@/lib/db/schema"

export interface IntakeEvidenceLink {
  id: string
  type: string
  title: string
  url: string
  summary?: string
}

export interface CivilianIntakeSummary {
  id: string
  type: string
  status: string
  urgency: string
  subject: string
  linkedCaseId: string | null
  createdAt: Date
  updatedAt: Date
}

/** All intake requests submitted by this client (no internal notes). */
export async function getCivilianIntakes(
  civilianId: string,
): Promise<CivilianIntakeSummary[]> {
  const rows = await db
    .select({
      id: intakeRequests.id,
      type: intakeRequests.type,
      status: intakeRequests.status,
      urgency: intakeRequests.urgency,
      subject: intakeRequests.subject,
      linkedCaseId: intakeRequests.linkedCaseId,
      createdAt: intakeRequests.createdAt,
      updatedAt: intakeRequests.updatedAt,
    })
    .from(intakeRequests)
    .where(eq(intakeRequests.civilianId, civilianId))
    .orderBy(desc(intakeRequests.createdAt))
  return rows
}

/** A single intake owned by this client, with its message thread. */
export async function getCivilianIntakeDetail(civilianId: string, intakeId: string) {
  const [row] = await db
    .select()
    .from(intakeRequests)
    .where(and(eq(intakeRequests.id, intakeId), eq(intakeRequests.civilianId, civilianId)))
    .limit(1)
  if (!row) return null

  const messages = await getIntakeMessages(intakeId)
  return {
    intake: {
      id: row.id,
      type: row.type,
      status: row.status,
      urgency: row.urgency,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      subject: row.subject,
      data: (row.data ?? {}) as Record<string, unknown>,
      evidence: (row.evidence ?? []) as IntakeEvidenceLink[],
      linkedCaseId: row.linkedCaseId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    messages,
  }
}

export interface CivilianMessageRow {
  id: string
  senderId: string
  senderRole: string
  senderName: string
  body: string
  createdAt: Date
  mine: boolean
}

async function hydrateMessages(
  rows: {
    id: string
    senderId: string
    senderRole: string
    body: string
    createdAt: Date
  }[],
  meId: string,
): Promise<CivilianMessageRow[]> {
  const ids = [...new Set(rows.map((r) => r.senderId))]
  const names = new Map<string, string>()
  if (ids.length) {
    const us = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(inArray(user.id, ids))
    us.forEach((u) => names.set(u.id, u.name))
  }
  return rows.map((r) => ({
    id: r.id,
    senderId: r.senderId,
    senderRole: r.senderRole,
    senderName: names.get(r.senderId) ?? (r.senderRole === "civilian" ? "You" : "Legal Team"),
    body: r.body,
    createdAt: r.createdAt,
    mine: r.senderId === meId,
  }))
}

export async function getIntakeMessages(intakeId: string, meId?: string) {
  const rows = await db
    .select({
      id: civilianMessages.id,
      senderId: civilianMessages.senderId,
      senderRole: civilianMessages.senderRole,
      body: civilianMessages.body,
      createdAt: civilianMessages.createdAt,
    })
    .from(civilianMessages)
    .where(eq(civilianMessages.intakeId, intakeId))
    .orderBy(asc(civilianMessages.createdAt))
  return hydrateMessages(rows, meId ?? "")
}

export async function getCaseMessages(caseId: string, meId?: string) {
  const rows = await db
    .select({
      id: civilianMessages.id,
      senderId: civilianMessages.senderId,
      senderRole: civilianMessages.senderRole,
      body: civilianMessages.body,
      createdAt: civilianMessages.createdAt,
    })
    .from(civilianMessages)
    .where(eq(civilianMessages.caseId, caseId))
    .orderBy(asc(civilianMessages.createdAt))
  return hydrateMessages(rows, meId ?? "")
}

export interface CivilianCaseSummary {
  caseId: string
  title: string
  caseNumber: string
  status: string
  courtDate: Date | null
  canViewStatus: boolean
  canViewCourtDates: boolean
  updatedAt: Date
}

/** Cases this client has been granted access to. */
export async function getCivilianCases(
  civilianId: string,
): Promise<CivilianCaseSummary[]> {
  const rows = await db
    .select({
      caseId: cases.id,
      title: cases.title,
      caseNumber: cases.caseNumber,
      status: cases.status,
      courtDate: cases.courtDate,
      updatedAt: cases.updatedAt,
      canViewStatus: caseCivilianAccess.canViewStatus,
      canViewCourtDates: caseCivilianAccess.canViewCourtDates,
    })
    .from(caseCivilianAccess)
    .innerJoin(cases, eq(cases.id, caseCivilianAccess.caseId))
    .where(eq(caseCivilianAccess.civilianId, civilianId))
    .orderBy(desc(cases.updatedAt))
  return rows
}

/** Look up the client's access row for a case (ownership gate). */
export async function getCivilianAccess(civilianId: string, caseId: string) {
  const [row] = await db
    .select()
    .from(caseCivilianAccess)
    .where(
      and(
        eq(caseCivilianAccess.caseId, caseId),
        eq(caseCivilianAccess.civilianId, civilianId),
      ),
    )
    .limit(1)
  return row ?? null
}

/** Full case view for a client, filtered strictly by their access flags. */
export async function getCivilianCaseDetail(civilianId: string, caseId: string) {
  const access = getCivilianAccess(civilianId, caseId)
  const [accessRow] = await Promise.all([access])
  if (!accessRow) return null

  const [c] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1)
  if (!c) return null

  const sharedEvidence = accessRow.canViewEvidence
    ? await db
        .select({
          id: evidence.id,
          title: evidence.title,
          evidenceType: evidence.evidenceType,
          link: evidence.link,
          summary: evidence.summary,
          createdAt: evidence.createdAt,
        })
        .from(evidence)
        .where(
          and(eq(evidence.caseId, caseId), eq(evidence.sharedWithCivilian, true)),
        )
        .orderBy(desc(evidence.createdAt))
    : []

  const sharedDrafts = accessRow.canViewDrafts
    ? await db
        .select({
          id: drafts.id,
          title: drafts.title,
          type: drafts.type,
          content: drafts.content,
          updatedAt: drafts.updatedAt,
        })
        .from(drafts)
        .where(and(eq(drafts.caseId, caseId), eq(drafts.sharedWithCivilian, true)))
        .orderBy(desc(drafts.updatedAt))
    : []

  const sharedSummaries = accessRow.canViewAiSummaries
    ? await db
        .select({
          id: aiAnalyses.id,
          result: aiAnalyses.result,
          createdAt: aiAnalyses.createdAt,
        })
        .from(aiAnalyses)
        .where(
          and(eq(aiAnalyses.caseId, caseId), eq(aiAnalyses.sharedWithCivilian, true)),
        )
        .orderBy(desc(aiAnalyses.createdAt))
    : []

  const courtDates = accessRow.canViewCourtDates
    ? await db
        .select({
          id: filingDeadlines.id,
          label: filingDeadlines.label,
          dueDate: filingDeadlines.dueDate,
          completed: filingDeadlines.completed,
        })
        .from(filingDeadlines)
        .where(eq(filingDeadlines.caseId, caseId))
        .orderBy(asc(filingDeadlines.dueDate))
    : []

  const messages = accessRow.canSendMessages
    ? await getCaseMessages(caseId, civilianId)
    : []

  return {
    access: accessRow,
    case: {
      id: c.id,
      title: c.title,
      caseNumber: c.caseNumber,
      caseType: c.caseType,
      status: c.status,
      closureRequested: c.closureRequested,
      closedAt: c.closedAt,
      courtDate: accessRow.canViewCourtDates ? c.courtDate : null,
      // Plain-language summary is only shown if AI summaries are shared.
      strategySummary: accessRow.canViewAiSummaries ? c.strategySummary : null,
      updatedAt: c.updatedAt,
    },
    sharedEvidence,
    sharedDrafts,
    sharedSummaries: sharedSummaries.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      result: s.result as Record<string, unknown>,
    })),
    courtDates,
    messages,
  }
}

/** Lightweight dashboard counters for the client home page. */
export async function getCivilianDashboard(civilianId: string) {
  const [intakes, linkedCases] = await Promise.all([
    getCivilianIntakes(civilianId),
    getCivilianCases(civilianId),
  ])
  const openIntakes = intakes.filter(
    (i) => i.status !== "converted_to_case" && i.status !== "declined",
  ).length
  return {
    intakes,
    cases: linkedCases,
    counts: {
      totalRequests: intakes.length,
      openRequests: openIntakes,
      activeCases: linkedCases.length,
    },
  }
}
