"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  aiAnalyses,
  caseCivilianAccess,
  cases,
  civilianMessages,
  drafts,
  evidence,
  intakeNotes,
  intakeRequests,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { selectableStatuses } from "@/lib/intake-config"
import { logAudit } from "@/lib/audit"
import type { IntakeEvidenceLink } from "@/lib/portal"
import type { IntakeAiReview } from "@/lib/intake"

function genCaseNumber(type: string) {
  const year = new Date().getFullYear()
  const rand = Math.floor(1000 + Math.random() * 9000)
  const prefix = type === "criminal" ? "CR" : "CV"
  return `${prefix}-${year}-${rand}`
}

async function requireIntakeReview() {
  const current = await requireUser()
  if (!current.permissions.includes("intake:review")) {
    throw new Error("You do not have permission to review intake requests")
  }
  return current
}

export async function setIntakeStatus(intakeId: string, status: string) {
  const current = await requireIntakeReview()
  const settings = await getSettings("civilian")
  const allowed = selectableStatuses(settings).map((s) => s.value)
  if (!allowed.includes(status)) {
    throw new Error("Invalid status")
  }
  await db
    .update(intakeRequests)
    .set({ status, updatedAt: new Date() })
    .where(eq(intakeRequests.id, intakeId))
  await logAudit({
    actorId: current.id,
    actorName: current.name,
    action: "intake.status",
    category: "intake",
    targetType: "intake",
    targetId: intakeId,
    summary: `Set intake status to ${status}`,
  })
  revalidatePath(`/intake/${intakeId}`)
  revalidatePath("/intake")
  revalidatePath("/portal/requests")
}

export async function assignIntakeReviewer(
  intakeId: string,
  reviewerId: string | null,
) {
  const current = await requireIntakeReview()
  await db
    .update(intakeRequests)
    .set({ reviewerId, updatedAt: new Date() })
    .where(eq(intakeRequests.id, intakeId))
  revalidatePath(`/intake/${intakeId}`)
  revalidatePath("/intake")
}

export async function addIntakeNote(intakeId: string, body: string) {
  const current = await requireIntakeReview()
  const text = body.trim()
  if (!text) return
  await db.insert(intakeNotes).values({
    intakeId,
    authorId: current.id,
    body: text.slice(0, 5000),
  })
  revalidatePath(`/intake/${intakeId}`)
}

/** Staff reply on an intake's client-facing message thread. */
export async function sendStaffIntakeMessage(intakeId: string, body: string) {
  const current = await requireIntakeReview()
  const text = body.trim()
  if (!text) return
  await db.insert(civilianMessages).values({
    intakeId,
    senderId: current.id,
    senderRole: "staff",
    body: text.slice(0, 5000),
  })
  revalidatePath(`/intake/${intakeId}`)
  revalidatePath(`/portal/requests/${intakeId}`)
}

/** Staff reply on a case's client-facing message thread. */
export async function sendStaffCaseMessage(caseId: string, body: string) {
  const current = await requireUser()
  const text = body.trim()
  if (!text) return
  await db.insert(civilianMessages).values({
    caseId,
    senderId: current.id,
    senderRole: "staff",
    body: text.slice(0, 5000),
  })
  revalidatePath(`/cases/${caseId}`)
  revalidatePath(`/portal/cases/${caseId}`)
}

export async function saveIntakeAiReview(intakeId: string, review: IntakeAiReview) {
  const current = await requireIntakeReview()
  if (!current.permissions.includes("ai:use")) {
    throw new Error("You do not have permission to run AI review")
  }
  await db
    .update(intakeRequests)
    .set({ aiReview: review, updatedAt: new Date() })
    .where(eq(intakeRequests.id, intakeId))
  revalidatePath(`/intake/${intakeId}`)
}

/**
 * Convert an accepted intake into a real case, grant the informant portal access,
 * optionally importing their submitted evidence.
 */
export async function convertIntakeToCase(
  intakeId: string,
  input: {
    title: string
    caseType: string
    priority: string
    importEvidence: boolean
  },
): Promise<{ ok: boolean; caseId?: string; error?: string }> {
  const current = await requireUser()
  if (!current.permissions.includes("intake:convert")) {
    throw new Error("You do not have permission to convert intake requests")
  }
  const [row] = await db
    .select()
    .from(intakeRequests)
    .where(eq(intakeRequests.id, intakeId))
    .limit(1)
  if (!row) return { ok: false, error: "Intake not found." }
  if (row.linkedCaseId) {
    return { ok: false, error: "This request is already linked to a case." }
  }

  const settings = await getSettings("civilian")
  const access = settings.defaultAccess

  const [created] = await db
    .insert(cases)
    .values({
      title: input.title.trim() || row.subject || "New Case",
      caseNumber: genCaseNumber(input.caseType),
      clientName: row.fullName || "Client",
      caseType: input.caseType,
      priority: input.priority,
      status: "intake",
      notes: buildIntakeSummaryNote(row),
      createdById: current.id,
    })
    .returning()

  // Grant the client scoped portal access to the new case.
  await db.insert(caseCivilianAccess).values({
    caseId: created.id,
    civilianId: row.civilianId,
    canViewStatus: access.canViewStatus,
    canViewCourtDates: access.canViewCourtDates,
    canViewEvidence: access.canViewEvidence,
    canSendMessages: access.canSendMessages,
    canAddEvidence: access.canAddEvidence,
    canViewDrafts: access.canViewDrafts,
    canViewAiSummaries: access.canViewAiSummaries,
  })

  // Optionally import client-submitted evidence links.
  if (input.importEvidence) {
    const links = (row.evidence ?? []) as IntakeEvidenceLink[]
    if (links.length) {
      await db.insert(evidence).values(
        links.map((l) => ({
          caseId: created.id,
          title: l.title.slice(0, 200),
          evidenceType: l.type || "external",
          link: l.url.slice(0, 2000),
          summary: l.summary ? l.summary.slice(0, 1000) : null,
          description: "Submitted by client during intake",
          status: "pending_review",
          addedById: current.id,
          sharedWithCivilian: true,
        })),
      )
    }
  }

  // Carry the intake message thread over to the case thread.
  await db
    .update(civilianMessages)
    .set({ caseId: created.id, intakeId: null })
    .where(eq(civilianMessages.intakeId, intakeId))

  await db
    .update(intakeRequests)
    .set({ status: "converted_to_case", linkedCaseId: created.id, updatedAt: new Date() })
    .where(eq(intakeRequests.id, intakeId))

  await logAudit({
    actorId: current.id,
    actorName: current.name,
    action: "intake.convert",
    category: "intake",
    targetType: "case",
    targetId: created.id,
    summary: `Converted intake "${row.subject}" into case ${created.caseNumber}`,
  })

  revalidatePath("/intake")
  revalidatePath(`/intake/${intakeId}`)
  revalidatePath("/cases")
  revalidatePath("/portal")
  revalidatePath("/portal/requests")
  return { ok: true, caseId: created.id }
}

function buildIntakeSummaryNote(row: typeof intakeRequests.$inferSelect): string {
  const data = (row.data ?? {}) as Record<string, unknown>
  const lines = [`Originated from client intake (${row.type}).`, ""]
  for (const [k, v] of Object.entries(data)) {
    if (v == null || v === "") continue
    lines.push(`${k}: ${String(v)}`)
  }
  return lines.join("\n")
}

/** Update a client's per-case access flags. */
export async function updateCivilianAccess(
  caseId: string,
  civilianId: string,
  flags: Partial<{
    canViewStatus: boolean
    canViewCourtDates: boolean
    canViewEvidence: boolean
    canSendMessages: boolean
    canAddEvidence: boolean
    canViewDrafts: boolean
    canViewAiSummaries: boolean
    canViewNotes: boolean
  }>,
) {
  const current = await requireUser()
  if (!current.permissions.includes("case:edit")) {
    throw new Error("You do not have permission to manage case access")
  }
  await db
    .update(caseCivilianAccess)
    .set(flags)
    .where(
      and(
        eq(caseCivilianAccess.caseId, caseId),
        eq(caseCivilianAccess.civilianId, civilianId),
      ),
    )
  revalidatePath(`/cases/${caseId}`)
  revalidatePath(`/portal/cases/${caseId}`)
}

/** Toggle whether a specific case artifact is shared with the client. */
export async function setEvidenceShared(id: string, caseId: string, shared: boolean) {
  const current = await requireUser()
  if (!current.permissions.includes("evidence:manage")) {
    throw new Error("Not permitted")
  }
  await db.update(evidence).set({ sharedWithCivilian: shared }).where(eq(evidence.id, id))
  revalidatePath(`/cases/${caseId}`)
  revalidatePath(`/portal/cases/${caseId}`)
}

export async function setDraftShared(id: string, caseId: string, shared: boolean) {
  const current = await requireUser()
  if (!current.permissions.includes("draft:manage")) {
    throw new Error("Not permitted")
  }
  await db.update(drafts).set({ sharedWithCivilian: shared }).where(eq(drafts.id, id))
  revalidatePath(`/cases/${caseId}`)
  revalidatePath(`/portal/cases/${caseId}`)
}

export async function setAnalysisShared(id: string, caseId: string, shared: boolean) {
  const current = await requireUser()
  if (!current.permissions.includes("ai:use")) {
    throw new Error("Not permitted")
  }
  await db
    .update(aiAnalyses)
    .set({ sharedWithCivilian: shared })
    .where(eq(aiAnalyses.id, id))
  revalidatePath(`/cases/${caseId}`)
  revalidatePath(`/portal/cases/${caseId}`)
}
