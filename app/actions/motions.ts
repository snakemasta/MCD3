"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { motions, motionHistory, cases } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"
import type { CurrentUser } from "@/lib/session"
import type { Permission } from "@/lib/constants"
import { getSettings } from "@/lib/settings"
import { generateMotionNumber, getMotion } from "@/lib/motions"
import { createNotification, notifyRoles } from "@/lib/notifications"
import { logMotionEvent } from "@/lib/case-timeline"
import type { EvidenceLink } from "@/lib/motion-utils"

async function requireUser(): Promise<CurrentUser> {
  const current = await getCurrentUser()
  if (!current) throw new Error("Unauthorized")
  if (current.disabled) throw new Error("Account suspended")
  return current
}

function requirePerm(current: CurrentUser, perm: Permission) {
  if (!current.permissions.includes(perm)) {
    throw new Error("You do not have permission to perform this action")
  }
}

function revalidateMotionViews(id?: string, caseId?: string) {
  revalidatePath("/motions")
  revalidatePath("/judge/motions")
  revalidatePath("/prosecution/motions")
  if (id) {
    revalidatePath(`/motions/${id}`)
    revalidatePath(`/judge/motion/${id}`)
  }
  if (caseId) {
    revalidatePath(`/cases/${caseId}`)
    revalidatePath(`/judge/case/${caseId}`)
    revalidatePath(`/prosecution/cases/${caseId}`)
  }
}

async function recordHistory(
  motionId: string,
  fromStatus: string | null,
  toStatus: string,
  actor: CurrentUser,
  notes?: string,
) {
  await db.insert(motionHistory).values({
    motionId,
    fromStatus,
    toStatus,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    notes: notes ?? null,
  })
}

/** Opposing side of a filing side, for cross-notifications. */
function opposingRolesFor(side: string): string[] {
  return side === "defense"
    ? ["state_attorney", "prosecutor"]
    : ["attorney", "public_defender", "paralegal"]
}

export interface MotionInput {
  caseId: string
  title: string
  motionType: string
  filingSide?: string
  relief?: string
  argument?: string
  factualBasis?: string
  authoritiesCited?: string
  evidenceLinks?: EvidenceLink[]
  hearingRequested?: boolean
  urgency?: string
}

function sanitizeLinks(links?: EvidenceLink[]): EvidenceLink[] {
  if (!Array.isArray(links)) return []
  return links
    .map((l) => ({ label: (l.label ?? "").trim(), url: (l.url ?? "").trim() }))
    .filter((l) => l.url.length > 0)
}

function toValues(input: MotionInput) {
  return {
    caseId: input.caseId,
    title: input.title.trim(),
    motionType: input.motionType || "other",
    filingSide: input.filingSide || "defense",
    relief: input.relief?.trim() || null,
    argument: input.argument?.trim() || null,
    factualBasis: input.factualBasis?.trim() || null,
    authoritiesCited: input.authoritiesCited?.trim() || null,
    evidenceLinks: sanitizeLinks(input.evidenceLinks),
    hearingRequested: Boolean(input.hearingRequested),
    urgency: input.urgency || "normal",
  }
}

/** Derive a sensible filing side from the user's role / the case side. */
async function deriveFilingSide(current: CurrentUser, caseId: string): Promise<string> {
  if (["state_attorney", "prosecutor"].includes(current.role)) return "prosecution"
  if (["attorney", "public_defender", "paralegal", "investigator"].includes(current.role)) return "defense"
  const [c] = await db.select({ side: cases.side }).from(cases).where(eq(cases.id, caseId)).limit(1)
  return c?.side === "prosecution" ? "prosecution" : "defense"
}

/** Create a motion (defaults to draft; file immediately when asked). */
export async function createMotion(input: MotionInput, file = false) {
  const current = await requireUser()
  requirePerm(current, "motion:file")
  if (!input.title?.trim()) throw new Error("A motion title is required")
  if (!input.caseId) throw new Error("A case is required to file a motion")

  const filingSide = input.filingSide || (await deriveFilingSide(current, input.caseId))
  const status = file ? "submitted" : "draft"
  const [row] = await db
    .insert(motions)
    .values({
      ...toValues({ ...input, filingSide }),
      motionNumber: generateMotionNumber(),
      filedById: current.id,
      filedByName: current.name,
      status,
      createdById: current.id,
    })
    .returning()

  await recordHistory(row.id, null, status, current, file ? "Motion filed" : "Draft created")

  if (file) {
    await onMotionFiled(row.id, current)
  }

  revalidateMotionViews(row.id, input.caseId)
  return { id: row.id }
}

/** Shared side effects when a motion enters the filed/submitted state. */
async function onMotionFiled(id: string, current: CurrentUser) {
  const motion = await getMotion(id)
  if (!motion) return
  const settings = await getSettings("motion")

  await logMotionEvent(
    motion.caseId,
    motion.motionNumber,
    `Filed by ${current.name}`,
    motion.title,
  )

  if (settings.notifyJudgeOnFiling) {
    await notifyRoles(settings.reviewerRoles, {
      type: "motion",
      title: "New motion filed",
      body: `${motion.title} (${motion.motionNumber}) is awaiting review.`,
      link: `/judge/motion/${id}`,
      motionId: id,
      caseId: motion.caseId,
    })
  }
  if (settings.notifyOpposingOnFiling) {
    await notifyRoles(opposingRolesFor(motion.filingSide), {
      type: "motion",
      title: "Opposing motion filed",
      body: `${motion.title} (${motion.motionNumber}) was filed and may require a response.`,
      link: `/motions/${id}`,
      motionId: id,
      caseId: motion.caseId,
    })
  }
}

/** Update a draft / needs-more-info motion (filer/owner only). */
export async function updateMotion(id: string, input: MotionInput) {
  const current = await requireUser()
  requirePerm(current, "motion:file")
  const motion = await getMotion(id)
  if (!motion) throw new Error("Motion not found")
  if (motion.filedById !== current.id && current.role !== "admin") {
    throw new Error("You can only edit your own motions")
  }
  if (!["draft", "needs_more_info"].includes(motion.status)) {
    throw new Error("Only draft or returned motions can be edited")
  }
  await db
    .update(motions)
    .set({ ...toValues({ ...input, filingSide: motion.filingSide }), updatedAt: new Date() })
    .where(eq(motions.id, id))
  revalidateMotionViews(id, motion.caseId)
}

/** File a draft motion. */
export async function fileMotion(id: string) {
  const current = await requireUser()
  requirePerm(current, "motion:file")
  const motion = await getMotion(id)
  if (!motion) throw new Error("Motion not found")
  if (motion.filedById !== current.id && current.role !== "admin") {
    throw new Error("You can only file your own motions")
  }
  if (!["draft", "needs_more_info"].includes(motion.status)) {
    throw new Error("This motion cannot be filed from its current status")
  }
  await db.update(motions).set({ status: "submitted", updatedAt: new Date() }).where(eq(motions.id, id))
  await recordHistory(id, motion.status, "submitted", current, "Motion filed")
  await onMotionFiled(id, current)
  revalidateMotionViews(id, motion.caseId)
}

/** Withdraw a motion (filer only). */
export async function withdrawMotion(id: string, reason?: string) {
  const current = await requireUser()
  requirePerm(current, "motion:file")
  const motion = await getMotion(id)
  if (!motion) throw new Error("Motion not found")
  if (motion.filedById !== current.id && current.role !== "admin") {
    throw new Error("You can only withdraw your own motions")
  }
  await db
    .update(motions)
    .set({ status: "withdrawn", closedAt: new Date(), updatedAt: new Date() })
    .where(eq(motions.id, id))
  await recordHistory(id, motion.status, "withdrawn", current, reason ?? "Motion withdrawn")
  await logMotionEvent(motion.caseId, motion.motionNumber, "Withdrawn", reason)
  revalidateMotionViews(id, motion.caseId)
}

/** Opposing party files a response to a motion. */
export async function respondToMotion(id: string, response: string) {
  const current = await requireUser()
  requirePerm(current, "motion:respond")
  if (!response.trim()) throw new Error("A response is required")
  const motion = await getMotion(id)
  if (!motion) throw new Error("Motion not found")
  await db
    .update(motions)
    .set({ opposingResponse: response.trim(), opposingRespondedById: current.id, updatedAt: new Date() })
    .where(eq(motions.id, id))
  await recordHistory(id, motion.status, motion.status, current, "Opposing response filed")
  await logMotionEvent(motion.caseId, motion.motionNumber, `Response filed by ${current.name}`)

  await notifyRoles(getSettingsReviewerFallback(), {
    type: "motion",
    title: "Response to motion filed",
    body: `A response was filed to ${motion.title} (${motion.motionNumber}).`,
    link: `/judge/motion/${id}`,
    motionId: id,
    caseId: motion.caseId,
  })
  // Notify the original filer.
  await createNotification({
    userId: motion.filedById,
    type: "motion",
    title: "Opposing party responded",
    body: `A response was filed to your motion ${motion.motionNumber}.`,
    link: `/motions/${id}`,
    motionId: id,
    caseId: motion.caseId,
  })
  revalidateMotionViews(id, motion.caseId)
}

function getSettingsReviewerFallback(): string[] {
  return ["judge"]
}

/** Movant responds to the court's request for more information. */
export async function respondToMotionInfoRequest(id: string, response: string) {
  const current = await requireUser()
  requirePerm(current, "motion:file")
  const motion = await getMotion(id)
  if (!motion) throw new Error("Motion not found")
  if (motion.filedById !== current.id && current.role !== "admin") {
    throw new Error("You can only respond to your own motions")
  }
  await db
    .update(motions)
    .set({ infoResponse: response.trim(), status: "submitted", updatedAt: new Date() })
    .where(eq(motions.id, id))
  await recordHistory(id, motion.status, "submitted", current, "Movant responded to information request")
  if (motion.judgeId) {
    await createNotification({
      userId: motion.judgeId,
      type: "motion",
      title: "Movant responded to your request",
      body: `${motion.title} (${motion.motionNumber}) has new information.`,
      link: `/judge/motion/${id}`,
      motionId: id,
      caseId: motion.caseId,
    })
  }
  revalidateMotionViews(id, motion.caseId)
}

// --- Judge actions ----------------------------------------------------------

/** Claim a motion for review (submitted -> under_review). */
export async function startMotionReview(id: string) {
  const current = await requireUser()
  requirePerm(current, "motion:review")
  const motion = await getMotion(id)
  if (!motion) throw new Error("Motion not found")
  await db
    .update(motions)
    .set({ status: "under_review", judgeId: current.id, judgeName: current.name, updatedAt: new Date() })
    .where(eq(motions.id, id))
  await recordHistory(id, motion.status, "under_review", current, "Review started")
  revalidateMotionViews(id, motion.caseId)
}

/** Return a motion to the movant with a question. */
export async function requestMotionInfo(id: string, question: string) {
  const current = await requireUser()
  requirePerm(current, "motion:review")
  if (!question.trim()) throw new Error("Describe what additional information is needed")
  const motion = await getMotion(id)
  if (!motion) throw new Error("Motion not found")
  await db
    .update(motions)
    .set({
      status: "needs_more_info",
      infoRequest: question.trim(),
      judgeId: current.id,
      judgeName: current.name,
      updatedAt: new Date(),
    })
    .where(eq(motions.id, id))
  await recordHistory(id, motion.status, "needs_more_info", current, question.trim())
  await createNotification({
    userId: motion.filedById,
    type: "motion",
    title: "More information requested",
    body: `The court needs more information on ${motion.motionNumber}.`,
    link: `/motions/${id}`,
    motionId: id,
    caseId: motion.caseId,
  })
  revalidateMotionViews(id, motion.caseId)
}

export type MotionRulingType = "granted" | "denied" | "granted_in_part"

/** Rule on a motion (grant / deny / grant in part). */
export async function ruleOnMotion(
  id: string,
  decision: MotionRulingType,
  ruling: string,
  rulingSummary?: string,
) {
  const current = await requireUser()
  requirePerm(current, "motion:rule")
  if (!ruling.trim()) throw new Error("A written ruling is required")
  const motion = await getMotion(id)
  if (!motion) throw new Error("Motion not found")

  await db
    .update(motions)
    .set({
      status: decision,
      ruling: ruling.trim(),
      rulingSummary: rulingSummary?.trim() || null,
      judgeId: current.id,
      judgeName: current.name,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(motions.id, id))
  await recordHistory(id, motion.status, decision, current, rulingSummary || ruling.trim())

  await logMotionEvent(
    motion.caseId,
    motion.motionNumber,
    `Ruling: ${decision.replace(/_/g, " ")}`,
    rulingSummary || ruling.trim(),
  )

  const settings = await getSettings("motion")
  if (settings.notifyFilerOnRuling) {
    await createNotification({
      userId: motion.filedById,
      type: "motion",
      title: `Motion ${decision.replace(/_/g, " ")}`,
      body: `${motion.motionNumber} was ruled on by ${current.name}.`,
      link: `/motions/${id}`,
      motionId: id,
      caseId: motion.caseId,
    })
  }
  // Notify the opposing party of the ruling too.
  await notifyRoles(opposingRolesFor(motion.filingSide), {
    type: "motion",
    title: `Motion ${decision.replace(/_/g, " ")}`,
    body: `${motion.title} (${motion.motionNumber}) was ruled on.`,
    link: `/motions/${id}`,
    motionId: id,
    caseId: motion.caseId,
  })
  revalidateMotionViews(id, motion.caseId)
}
