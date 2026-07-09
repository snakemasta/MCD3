import "server-only"
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  civilianMessages,
  intakeNotes,
  intakeRequests,
  user,
} from "@/lib/db/schema"
import type { IntakeEvidenceLink } from "@/lib/portal"

export interface IntakeListRow {
  id: string
  type: string
  status: string
  urgency: string
  subject: string
  fullName: string
  email: string
  reviewerId: string | null
  reviewerName: string | null
  linkedCaseId: string | null
  hasAiReview: boolean
  createdAt: Date
  updatedAt: Date
}

export async function listIntakes(filter?: {
  status?: string
  type?: string
  reviewerId?: string
}): Promise<IntakeListRow[]> {
  const conds = []
  if (filter?.status) conds.push(eq(intakeRequests.status, filter.status))
  if (filter?.type) conds.push(eq(intakeRequests.type, filter.type))
  if (filter?.reviewerId) conds.push(eq(intakeRequests.reviewerId, filter.reviewerId))

  const rows = await db
    .select({
      id: intakeRequests.id,
      type: intakeRequests.type,
      status: intakeRequests.status,
      urgency: intakeRequests.urgency,
      subject: intakeRequests.subject,
      fullName: intakeRequests.fullName,
      email: intakeRequests.email,
      reviewerId: intakeRequests.reviewerId,
      linkedCaseId: intakeRequests.linkedCaseId,
      aiReview: intakeRequests.aiReview,
      createdAt: intakeRequests.createdAt,
      updatedAt: intakeRequests.updatedAt,
    })
    .from(intakeRequests)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(intakeRequests.createdAt))

  const reviewerIds = [
    ...new Set(rows.map((r) => r.reviewerId).filter(Boolean) as string[]),
  ]
  const names = new Map<string, string>()
  if (reviewerIds.length) {
    const us = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(inArray(user.id, reviewerIds))
    us.forEach((u) => names.set(u.id, u.name))
  }

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    status: r.status,
    urgency: r.urgency,
    subject: r.subject,
    fullName: r.fullName,
    email: r.email,
    reviewerId: r.reviewerId,
    reviewerName: r.reviewerId ? names.get(r.reviewerId) ?? null : null,
    linkedCaseId: r.linkedCaseId,
    hasAiReview: r.aiReview != null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }))
}

export interface IntakeNoteRow {
  id: string
  authorId: string
  authorName: string
  body: string
  createdAt: Date
}

/** Full intake for staff review: answers, evidence, notes, messages, AI review. */
export async function getIntakeDetail(id: string) {
  const [row] = await db
    .select()
    .from(intakeRequests)
    .where(eq(intakeRequests.id, id))
    .limit(1)
  if (!row) return null

  const [noteRows, messageRows] = await Promise.all([
    db
      .select()
      .from(intakeNotes)
      .where(eq(intakeNotes.intakeId, id))
      .orderBy(desc(intakeNotes.createdAt)),
    db
      .select()
      .from(civilianMessages)
      .where(eq(civilianMessages.intakeId, id))
      .orderBy(asc(civilianMessages.createdAt)),
  ])

  const ids = [
    ...new Set([
      ...noteRows.map((n) => n.authorId),
      ...messageRows.map((m) => m.senderId),
      ...(row.reviewerId ? [row.reviewerId] : []),
    ]),
  ]
  const names = new Map<string, string>()
  if (ids.length) {
    const us = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(inArray(user.id, ids))
    us.forEach((u) => names.set(u.id, u.name))
  }

  return {
    intake: {
      id: row.id,
      civilianId: row.civilianId,
      type: row.type,
      status: row.status,
      urgency: row.urgency,
      reviewerId: row.reviewerId,
      reviewerName: row.reviewerId ? names.get(row.reviewerId) ?? null : null,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      subject: row.subject,
      data: (row.data ?? {}) as Record<string, unknown>,
      evidence: (row.evidence ?? []) as IntakeEvidenceLink[],
      aiReview: (row.aiReview ?? null) as IntakeAiReview | null,
      linkedCaseId: row.linkedCaseId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    notes: noteRows.map((n) => ({
      id: n.id,
      authorId: n.authorId,
      authorName: names.get(n.authorId) ?? "Staff",
      body: n.body,
      createdAt: n.createdAt,
    })),
    messages: messageRows.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderRole: m.senderRole,
      senderName: names.get(m.senderId) ?? (m.senderRole === "civilian" ? row.fullName || "Client" : "Staff"),
      body: m.body,
      createdAt: m.createdAt,
    })),
  }
}

export interface IntakeAiReview {
  recommendation: "accept" | "decline" | "needs_info"
  meritScore: number
  summary: string
  caseType: string
  suggestedPriority: string
  legalIssues: string[]
  missingInfo: string[]
  redFlags: string[]
  suggestedNextSteps: string[]
}

/** Count of intakes per canonical status (for queue badges). */
export async function intakeStatusCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      status: intakeRequests.status,
      n: sql<number>`count(*)::int`,
    })
    .from(intakeRequests)
    .groupBy(intakeRequests.status)
  const out: Record<string, number> = {}
  rows.forEach((r) => {
    out[r.status] = Number(r.n)
  })
  return out
}

/** Number of intakes awaiting attention (new or under review). */
export async function openIntakeCount(): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(intakeRequests)
    .where(inArray(intakeRequests.status, ["new", "under_review", "needs_info"]))
  return Number(n ?? 0)
}
