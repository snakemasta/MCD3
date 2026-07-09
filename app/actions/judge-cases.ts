"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { cases } from "@/lib/db/schema"
import { requireJudge } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { addCaseEvent } from "@/lib/case-timeline"
import { createNotification } from "@/lib/notifications"
import { CASE_STATUSES } from "@/lib/constants"

async function loadCaseOr404(id: string) {
  const [row] = await db.select().from(cases).where(eq(cases.id, id)).limit(1)
  if (!row) throw new Error("Case not found")
  return row
}

/** Notify a case's assigned attorney + paralegal of a judicial action. */
async function notifyCaseTeam(
  caseRow: typeof cases.$inferSelect,
  title: string,
  body: string,
) {
  const recipients = [caseRow.assignedAttorneyId, caseRow.assignedParalegalId].filter(
    Boolean,
  ) as string[]
  await Promise.all(
    recipients.map((userId) =>
      createNotification({
        userId,
        type: "case",
        title,
        body,
        caseId: caseRow.id,
        link: `/cases/${caseRow.id}`,
      }),
    ),
  )
}

/** Schedule a hearing on a case; recorded as a pending event on the timeline. */
export async function scheduleCaseHearing(input: {
  caseId: string
  date: string
  hearingType: string
  notes?: string
}) {
  const judge = await requireJudge()
  const caseRow = await loadCaseOr404(input.caseId)

  const title = `Hearing scheduled: ${input.hearingType}`
  await addCaseEvent({
    caseId: input.caseId,
    title,
    eventType: "court",
    date: input.date,
    description: input.notes
      ? `${input.notes}\n\nScheduled by ${judge.name}.`
      : `Scheduled by ${judge.name}.`,
    deadlineStatus: "pending",
  })

  await logAudit({
    actorId: judge.id,
    actorName: judge.name,
    action: "case.hearing_scheduled",
    category: "case",
    targetType: "case",
    targetId: input.caseId,
    summary: `Scheduled a ${input.hearingType} hearing on case ${caseRow.caseNumber}`,
    metadata: { date: input.date },
  })

  await notifyCaseTeam(
    caseRow,
    "Hearing scheduled",
    `${judge.name} scheduled a ${input.hearingType} hearing for ${new Date(input.date).toLocaleDateString()}.`,
  )

  revalidatePath(`/judge/case/${input.caseId}`)
  revalidatePath(`/cases/${input.caseId}`)
  return { ok: true }
}

/** Record a judicial order or finding on the case (timeline event + audit). */
export async function recordCaseOrder(input: {
  caseId: string
  title: string
  body: string
}) {
  const judge = await requireJudge()
  const caseRow = await loadCaseOr404(input.caseId)

  await addCaseEvent({
    caseId: input.caseId,
    title: `Court order: ${input.title}`,
    eventType: "court",
    description: `${input.body}\n\nEntered by ${judge.name}.`,
    deadlineStatus: "complete",
  })

  await logAudit({
    actorId: judge.id,
    actorName: judge.name,
    action: "case.order_entered",
    category: "case",
    targetType: "case",
    targetId: input.caseId,
    summary: `Entered a court order on case ${caseRow.caseNumber}: ${input.title}`,
  })

  await notifyCaseTeam(
    caseRow,
    "Court order entered",
    `${judge.name} entered an order on your case: ${input.title}.`,
  )

  revalidatePath(`/judge/case/${input.caseId}`)
  revalidatePath(`/cases/${input.caseId}`)
  return { ok: true }
}

/** Change a case's status (judge authority), including close/reopen. */
export async function setCaseStatusAsJudge(input: {
  caseId: string
  status: string
  note?: string
}) {
  const judge = await requireJudge()
  const caseRow = await loadCaseOr404(input.caseId)

  const valid = CASE_STATUSES.some((s) => s.value === input.status)
  if (!valid) throw new Error("Invalid case status")

  const wasClosed = caseRow.status === "closed"
  const nowClosed = input.status === "closed"

  await db
    .update(cases)
    .set({
      status: input.status,
      closedAt: nowClosed ? new Date() : wasClosed && !nowClosed ? null : caseRow.closedAt,
      updatedAt: new Date(),
    })
    .where(eq(cases.id, input.caseId))

  const statusLabel = CASE_STATUSES.find((s) => s.value === input.status)?.label ?? input.status
  await addCaseEvent({
    caseId: input.caseId,
    title: `Case status changed to ${statusLabel}`,
    eventType: "court",
    description: input.note ? `${input.note}\n\nBy ${judge.name}.` : `Changed by ${judge.name}.`,
    deadlineStatus: "complete",
  })

  await logAudit({
    actorId: judge.id,
    actorName: judge.name,
    action: nowClosed ? "case.closed" : wasClosed ? "case.reopened" : "case.status_changed",
    category: "case",
    targetType: "case",
    targetId: input.caseId,
    summary: `Set case ${caseRow.caseNumber} status to ${statusLabel}`,
  })

  await notifyCaseTeam(
    caseRow,
    nowClosed ? "Case closed by the court" : "Case status updated",
    `${judge.name} set the status of your case to ${statusLabel}.`,
  )

  revalidatePath(`/judge/case/${input.caseId}`)
  revalidatePath(`/cases/${input.caseId}`)
  return { ok: true }
}
