"use server"

import { randomUUID } from "crypto"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  caseCivilianAccess,
  cases,
  civilianMessages,
  evidence,
  intakeRequests,
} from "@/lib/db/schema"
import { requireCivilian } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { enabledRequestTypes, validateIntake } from "@/lib/intake-config"
import type { IntakeEvidenceLink } from "@/lib/portal"
import { logAudit } from "@/lib/audit"

const EDITABLE_INTAKE_STATUSES = ["new", "under_review", "needs_info"]

function sanitizeEvidence(input: unknown): IntakeEvidenceLink[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((e) => e && typeof e === "object")
    .map((e) => {
      const o = e as Record<string, unknown>
      return {
        id: typeof o.id === "string" ? o.id : randomUUID(),
        type: typeof o.type === "string" ? o.type : "external",
        title: String(o.title ?? "").slice(0, 200),
        url: String(o.url ?? "").slice(0, 2000),
        summary: o.summary ? String(o.summary).slice(0, 1000) : undefined,
      }
    })
    .filter((e) => e.title && e.url)
}

export async function submitIntake(input: {
  type: string
  urgency: string
  values: Record<string, string>
  evidence?: IntakeEvidenceLink[]
}): Promise<{ ok: boolean; id?: string; errors?: Record<string, string>; error?: string }> {
  const current = await requireCivilian()
  const settings = await getSettings("civilian")

  const allowedTypes = enabledRequestTypes(settings).map((t) => t.value as string)
  if (!allowedTypes.includes(input.type)) {
    return { ok: false, error: "That request type is not currently accepted." }
  }

  const { ok, errors } = validateIntake(input.type, settings, input.values)
  if (!ok) return { ok: false, errors }

  const evidenceLinks = sanitizeEvidence(input.evidence)

  const [created] = await db
    .insert(intakeRequests)
    .values({
      civilianId: current.id,
      type: input.type,
      status: "new",
      urgency: input.urgency || "normal",
      fullName: (input.values.fullName ?? current.name ?? "").slice(0, 200),
      email: (input.values.email ?? current.email ?? "").slice(0, 200),
      phone: input.values.phone ? input.values.phone.slice(0, 50) : null,
      subject: (input.values.subject ?? "").slice(0, 300),
      data: input.values,
      evidence: evidenceLinks,
    })
    .returning()

  await logAudit({
    actorId: current.id,
    actorName: current.name,
    action: "intake.submit",
    category: "intake",
    targetType: "intake",
    targetId: created.id,
    summary: `Client submitted a ${input.type} intake request: "${created.subject}"`,
  })

  revalidatePath("/portal")
  revalidatePath("/portal/requests")
  revalidatePath("/intake")
  return { ok: true, id: created.id }
}

/** Client responds to a "needs more info" request by updating their answers. */
export async function respondToIntake(
  intakeId: string,
  values: Record<string, string>,
): Promise<{ ok: boolean; errors?: Record<string, string>; error?: string }> {
  const current = await requireCivilian()
  const [row] = await db
    .select()
    .from(intakeRequests)
    .where(
      and(eq(intakeRequests.id, intakeId), eq(intakeRequests.civilianId, current.id)),
    )
    .limit(1)
  if (!row) return { ok: false, error: "Request not found." }
  if (!EDITABLE_INTAKE_STATUSES.includes(row.status)) {
    return { ok: false, error: "This request can no longer be edited." }
  }

  const settings = await getSettings("civilian")
  const merged = { ...(row.data as Record<string, string>), ...values }
  const { ok, errors } = validateIntake(row.type, settings, merged)
  if (!ok) return { ok: false, errors }

  await db
    .update(intakeRequests)
    .set({
      data: merged,
      subject: (merged.subject ?? row.subject).slice(0, 300),
      phone: merged.phone ? merged.phone.slice(0, 50) : row.phone,
      // Returning info moves a needs_info request back into the review queue.
      status: row.status === "needs_info" ? "under_review" : row.status,
      updatedAt: new Date(),
    })
    .where(eq(intakeRequests.id, intakeId))

  revalidatePath(`/portal/requests/${intakeId}`)
  revalidatePath("/portal/requests")
  revalidatePath(`/intake/${intakeId}`)
  return { ok: true }
}

/** Append an evidence link to an editable intake request. */
export async function addIntakeEvidence(
  intakeId: string,
  link: IntakeEvidenceLink,
): Promise<{ ok: boolean; error?: string }> {
  const current = await requireCivilian()
  const [row] = await db
    .select()
    .from(intakeRequests)
    .where(
      and(eq(intakeRequests.id, intakeId), eq(intakeRequests.civilianId, current.id)),
    )
    .limit(1)
  if (!row) return { ok: false, error: "Request not found." }
  if (!EDITABLE_INTAKE_STATUSES.includes(row.status)) {
    return { ok: false, error: "This request can no longer be edited." }
  }
  const [clean] = sanitizeEvidence([link])
  if (!clean) return { ok: false, error: "Provide a title and a valid link." }
  const next = [...((row.evidence ?? []) as IntakeEvidenceLink[]), clean]
  await db
    .update(intakeRequests)
    .set({ evidence: next, updatedAt: new Date() })
    .where(eq(intakeRequests.id, intakeId))
  revalidatePath(`/portal/requests/${intakeId}`)
  revalidatePath(`/intake/${intakeId}`)
  return { ok: true }
}

export async function sendCivilianMessage(input: {
  intakeId?: string
  caseId?: string
  body: string
}): Promise<{ ok: boolean; error?: string }> {
  const current = await requireCivilian()
  const body = input.body.trim()
  if (!body) return { ok: false, error: "Message cannot be empty." }

  if (input.intakeId) {
    const [row] = await db
      .select({ id: intakeRequests.id })
      .from(intakeRequests)
      .where(
        and(
          eq(intakeRequests.id, input.intakeId),
          eq(intakeRequests.civilianId, current.id),
        ),
      )
      .limit(1)
    if (!row) return { ok: false, error: "Request not found." }
    await db.insert(civilianMessages).values({
      intakeId: input.intakeId,
      senderId: current.id,
      senderRole: "civilian",
      body: body.slice(0, 5000),
    })
    revalidatePath(`/portal/requests/${input.intakeId}`)
    revalidatePath(`/intake/${input.intakeId}`)
    return { ok: true }
  }

  if (input.caseId) {
    const access = await db
      .select()
      .from(caseCivilianAccess)
      .where(
        and(
          eq(caseCivilianAccess.caseId, input.caseId),
          eq(caseCivilianAccess.civilianId, current.id),
        ),
      )
      .limit(1)
    if (!access[0] || !access[0].canSendMessages) {
      return { ok: false, error: "Messaging is not enabled for this case." }
    }
    await db.insert(civilianMessages).values({
      caseId: input.caseId,
      senderId: current.id,
      senderRole: "civilian",
      body: body.slice(0, 5000),
    })
    revalidatePath(`/portal/cases/${input.caseId}`)
    revalidatePath(`/cases/${input.caseId}`)
    return { ok: true }
  }

  return { ok: false, error: "Nothing to send to." }
}

/** Client uploads/links evidence to a case (only if allowed by access flags). */
export async function addCivilianCaseEvidence(input: {
  caseId: string
  title: string
  evidenceType: string
  link: string
  description?: string
}): Promise<{ ok: boolean; error?: string }> {
  const current = await requireCivilian()
  const [access] = await db
    .select()
    .from(caseCivilianAccess)
    .where(
      and(
        eq(caseCivilianAccess.caseId, input.caseId),
        eq(caseCivilianAccess.civilianId, current.id),
      ),
    )
    .limit(1)
  if (!access || !access.canAddEvidence) {
    return { ok: false, error: "You are not permitted to add evidence to this case." }
  }
  const title = input.title.trim()
  const link = input.link.trim()
  if (!title || !link) return { ok: false, error: "Provide a title and a link." }

  await db.insert(evidence).values({
    caseId: input.caseId,
    title: title.slice(0, 200),
    evidenceType: input.evidenceType || "external",
    link: link.slice(0, 2000),
    description: input.description ? input.description.slice(0, 1000) : null,
    status: "pending_review",
    addedById: current.id,
    // Visible to the client who submitted it.
    sharedWithCivilian: true,
  })
  revalidatePath(`/portal/cases/${input.caseId}`)
  revalidatePath(`/cases/${input.caseId}`)
  return { ok: true }
}

/**
 * Lets a linked client request that their case be closed. This does not close
 * the case directly — it flags the case so staff can review and confirm.
 */
export async function requestCaseClosure(input: {
  caseId: string
  reason?: string
}): Promise<{ ok: boolean; error?: string }> {
  const current = await requireCivilian()

  // Verify the client is actually linked to this case.
  const [access] = await db
    .select()
    .from(caseCivilianAccess)
    .where(
      and(
        eq(caseCivilianAccess.caseId, input.caseId),
        eq(caseCivilianAccess.civilianId, current.id),
      ),
    )
    .limit(1)
  if (!access) {
    return { ok: false, error: "You do not have access to this case." }
  }

  const [existing] = await db
    .select({ status: cases.status, closureRequested: cases.closureRequested })
    .from(cases)
    .where(eq(cases.id, input.caseId))
    .limit(1)
  if (!existing) return { ok: false, error: "Case not found." }
  if (existing.status === "closed") {
    return { ok: false, error: "This case is already closed." }
  }
  if (existing.closureRequested) {
    return { ok: false, error: "A closure request is already pending for this case." }
  }

  await db
    .update(cases)
    .set({
      closureRequested: true,
      closureRequestedAt: new Date(),
      closureRequestedById: current.id,
      closureReason: input.reason ? input.reason.slice(0, 1000) : null,
      updatedAt: new Date(),
    })
    .where(eq(cases.id, input.caseId))

  await logAudit({
    action: "case.closure_requested",
    category: "case",
    targetId: input.caseId,
    summary: `Client requested closure of case`,
  })

  revalidatePath(`/portal/cases/${input.caseId}`)
  revalidatePath(`/cases/${input.caseId}`)
  return { ok: true }
}
