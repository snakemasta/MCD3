"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  warrants,
  warrantHistory,
  warrantCloseouts,
  cases,
  prosecutionCharges,
  timelineEvents,
  evidence,
} from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"
import type { CurrentUser } from "@/lib/session"
import type { Permission } from "@/lib/constants"
import { getSettings } from "@/lib/settings"
import { generateWarrantNumber, getWarrant } from "@/lib/warrants"
import { createNotification, notifyRoles } from "@/lib/notifications"
import {
  initializeProsecutionCaseAccess,
  initializeDefenseCaseAccess,
} from "@/lib/case-access"
import type { EvidenceLink } from "@/lib/warrant-utils"

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

function revalidateWarrantViews(id?: string) {
  revalidatePath("/le/warrants")
  revalidatePath("/judge/queue")
  revalidatePath("/judge/warrants")
  revalidatePath("/prosecution/warrants")
  revalidatePath("/warrants")
  if (id) {
    revalidatePath(`/le/warrant/${id}`)
    revalidatePath(`/judge/warrant/${id}`)
    revalidatePath(`/prosecution/warrant/${id}`)
    revalidatePath(`/warrants/${id}`)
  }
}

async function recordHistory(
  warrantId: string,
  fromStatus: string | null,
  toStatus: string,
  actor: CurrentUser,
  notes?: string,
) {
  await db.insert(warrantHistory).values({
    warrantId,
    fromStatus,
    toStatus,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    notes: notes ?? null,
  })
}

export interface WarrantInput {
  title: string
  warrantType: string
  suspectName?: string
  dateOfBirth?: string
  agency?: string
  requestedCharges?: string
  probableCause?: string
  incidentSummary?: string
  incidentDate?: string | null
  location?: string
  itemsSought?: string
  riskLevel?: string
  evidenceLinks?: EvidenceLink[]
  evidenceSummaries?: string
  relatedPoliceReportId?: string | null
  notesToJudge?: string
}

function sanitizeLinks(links?: EvidenceLink[]): EvidenceLink[] {
  if (!Array.isArray(links)) return []
  return links
    .map((l) => ({ label: (l.label ?? "").trim(), url: (l.url ?? "").trim() }))
    .filter((l) => l.url.length > 0)
}

function toValues(input: WarrantInput) {
  return {
    title: input.title.trim(),
    warrantType: input.warrantType || "arrest",
    suspectName: input.suspectName?.trim() || null,
    dateOfBirth: input.dateOfBirth?.trim() || null,
    agency: input.agency?.trim() || null,
    requestedCharges: input.requestedCharges?.trim() || null,
    probableCause: input.probableCause?.trim() || null,
    incidentSummary: input.incidentSummary?.trim() || null,
    incidentDate: input.incidentDate ? new Date(input.incidentDate) : null,
    location: input.location?.trim() || null,
    itemsSought: input.itemsSought?.trim() || null,
    riskLevel: input.riskLevel || "medium",
    evidenceLinks: sanitizeLinks(input.evidenceLinks),
    evidenceSummaries: input.evidenceSummaries?.trim() || null,
    relatedPoliceReportId: input.relatedPoliceReportId || null,
    notesToJudge: input.notesToJudge?.trim() || null,
  }
}

/** Create a warrant request (defaults to draft; submit immediately when asked). */
export async function createWarrant(input: WarrantInput, submit = false) {
  const current = await requireUser()
  requirePerm(current, "warrant:submit")
  if (!input.title?.trim()) throw new Error("A warrant title is required")

  const status = submit ? "submitted" : "draft"
  const [row] = await db
    .insert(warrants)
    .values({
      ...toValues(input),
      warrantNumber: generateWarrantNumber(),
      requestingOfficerId: current.id,
      requestingOfficerName: current.name,
      status,
      createdById: current.id,
    })
    .returning()

  await recordHistory(row.id, null, status, current, submit ? "Submitted for review" : "Draft created")

  if (submit) {
    const { reviewerRoles } = await getSettings("warrant")
    await notifyRoles(reviewerRoles, {
      type: "warrant",
      title: "New warrant request submitted",
      body: `${row.title} (${row.warrantNumber}) is awaiting review.`,
      link: `/judge/warrant/${row.id}`,
      warrantId: row.id,
    })
  }

  revalidateWarrantViews(row.id)
  return { id: row.id }
}

/** Update a draft / needs-more-info warrant (officer/owner only). */
export async function updateWarrant(id: string, input: WarrantInput) {
  const current = await requireUser()
  requirePerm(current, "warrant:submit")
  const warrant = await getWarrant(id)
  if (!warrant) throw new Error("Warrant not found")
  if (warrant.requestingOfficerId !== current.id && current.role !== "admin") {
    throw new Error("You can only edit your own warrant requests")
  }
  if (!["draft", "needs_more_info"].includes(warrant.status)) {
    throw new Error("Only draft or returned warrants can be edited")
  }
  await db
    .update(warrants)
    .set({ ...toValues(input), updatedAt: new Date() })
    .where(eq(warrants.id, id))
  revalidateWarrantViews(id)
}

/** Submit a draft warrant for judicial review. */
export async function submitWarrant(id: string) {
  const current = await requireUser()
  requirePerm(current, "warrant:submit")
  const warrant = await getWarrant(id)
  if (!warrant) throw new Error("Warrant not found")
  if (warrant.requestingOfficerId !== current.id && current.role !== "admin") {
    throw new Error("You can only submit your own warrant requests")
  }
  if (!["draft", "needs_more_info"].includes(warrant.status)) {
    throw new Error("This warrant cannot be submitted from its current status")
  }
  await db
    .update(warrants)
    .set({ status: "submitted", updatedAt: new Date() })
    .where(eq(warrants.id, id))
  await recordHistory(id, warrant.status, "submitted", current, "Submitted for review")

  const { reviewerRoles } = await getSettings("warrant")
  await notifyRoles(reviewerRoles, {
    type: "warrant",
    title: "Warrant request submitted",
    body: `${warrant.title} (${warrant.warrantNumber}) is awaiting review.`,
    link: `/judge/warrant/${id}`,
    warrantId: id,
  })
  revalidateWarrantViews(id)
}

/** Officer responds to a judge's request for more information. */
export async function respondToInfoRequest(id: string, response: string) {
  const current = await requireUser()
  requirePerm(current, "warrant:submit")
  const warrant = await getWarrant(id)
  if (!warrant) throw new Error("Warrant not found")
  if (warrant.requestingOfficerId !== current.id && current.role !== "admin") {
    throw new Error("You can only respond to your own warrant requests")
  }
  await db
    .update(warrants)
    .set({ infoResponse: response.trim(), status: "submitted", updatedAt: new Date() })
    .where(eq(warrants.id, id))
  await recordHistory(id, warrant.status, "submitted", current, "Officer responded to information request")

  if (warrant.judgeId) {
    await createNotification({
      userId: warrant.judgeId,
      type: "warrant",
      title: "Officer responded to your request",
      body: `${warrant.title} (${warrant.warrantNumber}) has new information.`,
      link: `/judge/warrant/${id}`,
      warrantId: id,
    })
  }
  revalidateWarrantViews(id)
}

// --- Judge actions ----------------------------------------------------------

/** Claim a warrant for review (submitted -> under_review). */
export async function startWarrantReview(id: string) {
  const current = await requireUser()
  requirePerm(current, "warrant:review")
  const warrant = await getWarrant(id)
  if (!warrant) throw new Error("Warrant not found")
  await db
    .update(warrants)
    .set({
      status: "under_review",
      judgeId: current.id,
      judgeName: current.name,
      updatedAt: new Date(),
    })
    .where(eq(warrants.id, id))
  await recordHistory(id, warrant.status, "under_review", current, "Review started")
  revalidateWarrantViews(id)
}

/** Save the judge's working notes without changing status. */
export async function saveJudgeNotes(id: string, notes: string) {
  const current = await requireUser()
  requirePerm(current, "warrant:review")
  const warrant = await getWarrant(id)
  if (!warrant) throw new Error("Warrant not found")
  await db
    .update(warrants)
    .set({
      judgeNotes: notes,
      judgeId: warrant.judgeId ?? current.id,
      judgeName: warrant.judgeName ?? current.name,
      updatedAt: new Date(),
    })
    .where(eq(warrants.id, id))
  revalidateWarrantViews(id)
}

/** Return a warrant to the officer with a question. */
export async function requestMoreInfo(id: string, question: string, notes?: string) {
  const current = await requireUser()
  requirePerm(current, "warrant:review")
  if (!question.trim()) throw new Error("Describe what additional information is needed")
  const warrant = await getWarrant(id)
  if (!warrant) throw new Error("Warrant not found")
  await db
    .update(warrants)
    .set({
      status: "needs_more_info",
      infoRequest: question.trim(),
      judgeId: current.id,
      judgeName: current.name,
      judgeNotes: notes ?? warrant.judgeNotes,
      updatedAt: new Date(),
    })
    .where(eq(warrants.id, id))
  await recordHistory(id, warrant.status, "needs_more_info", current, question.trim())

  const { notifyOfficerOnDecision } = await getSettings("warrant")
  if (notifyOfficerOnDecision) {
    await createNotification({
      userId: warrant.requestingOfficerId,
      type: "warrant",
      title: "More information requested",
      body: `Judge ${current.name} needs more information on ${warrant.warrantNumber}.`,
      link: `/le/warrant/${id}`,
      warrantId: id,
    })
  }
  revalidateWarrantViews(id)
}

/** Deny a warrant. */
export async function denyWarrant(id: string, reason: string, notes?: string) {
  const current = await requireUser()
  requirePerm(current, "warrant:approve")
  if (!reason.trim()) throw new Error("A reason for denial is required")
  const warrant = await getWarrant(id)
  if (!warrant) throw new Error("Warrant not found")
  await db
    .update(warrants)
    .set({
      status: "denied",
      denyReason: reason.trim(),
      judgeId: current.id,
      judgeName: current.name,
      judgeNotes: notes ?? warrant.judgeNotes,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(warrants.id, id))
  await recordHistory(id, warrant.status, "denied", current, reason.trim())

  const { notifyOfficerOnDecision } = await getSettings("warrant")
  if (notifyOfficerOnDecision) {
    await createNotification({
      userId: warrant.requestingOfficerId,
      type: "warrant",
      title: "Warrant denied",
      body: `${warrant.warrantNumber} was denied: ${reason.trim()}`,
      link: `/le/warrant/${id}`,
      warrantId: id,
    })
  }
  revalidateWarrantViews(id)
}

/** Mark a warrant not active / returned (administrative statuses). */
export async function setWarrantStatus(
  id: string,
  status: "not_active" | "warrant_returned",
  notes?: string,
) {
  const current = await requireUser()
  requirePerm(current, "warrant:approve")
  const warrant = await getWarrant(id)
  if (!warrant) throw new Error("Warrant not found")
  await db
    .update(warrants)
    .set({
      status,
      judgeId: warrant.judgeId ?? current.id,
      judgeName: warrant.judgeName ?? current.name,
      judgeNotes: notes ?? warrant.judgeNotes,
      updatedAt: new Date(),
    })
    .where(eq(warrants.id, id))
  await recordHistory(id, warrant.status, status, current, notes)

  await createNotification({
    userId: warrant.requestingOfficerId,
    type: "warrant",
    title: `Warrant marked ${status.replace(/_/g, " ")}`,
    body: `${warrant.warrantNumber} was updated by ${current.name}.`,
    link: `/le/warrant/${id}`,
    warrantId: id,
  })
  revalidateWarrantViews(id)
}

/** Approve a warrant and (optionally) spin up a prosecution case. */
export async function approveWarrant(id: string, notes?: string) {
  const current = await requireUser()
  requirePerm(current, "warrant:approve")
  const warrant = await getWarrant(id)
  if (!warrant) throw new Error("Warrant not found")

  const settings = await getSettings("warrant")
  let prosecutionCaseId: string | null = warrant.linkedProsecutionCaseId

  if (settings.autoCreateProsecutionCase && !prosecutionCaseId) {
    prosecutionCaseId = await createProsecutionCaseFromWarrant(warrant, current)
  }

  await db
    .update(warrants)
    .set({
      status: "approved",
      judgeId: current.id,
      judgeName: current.name,
      judgeNotes: notes ?? warrant.judgeNotes,
      decidedAt: new Date(),
      linkedProsecutionCaseId: prosecutionCaseId,
      updatedAt: new Date(),
    })
    .where(eq(warrants.id, id))
  await recordHistory(id, warrant.status, "approved", current, notes ?? "Warrant approved")

  if (settings.notifyOfficerOnDecision) {
    await createNotification({
      userId: warrant.requestingOfficerId,
      type: "warrant",
      title: "Warrant approved",
      body: `${warrant.warrantNumber} was approved by Judge ${current.name}.`,
      link: `/le/warrant/${id}`,
      warrantId: id,
    })
  }
  if (settings.notifyStateAttorneyOnApproval) {
    await notifyRoles(["state_attorney", "prosecutor"], {
      type: "warrant",
      title: "Approved warrant in queue",
      body: `${warrant.title} (${warrant.warrantNumber}) was approved and added to the prosecution queue.`,
      link: prosecutionCaseId ? `/prosecution/cases/${prosecutionCaseId}` : `/prosecution/warrants`,
      warrantId: id,
      caseId: prosecutionCaseId ?? undefined,
    })
  }
  revalidateWarrantViews(id)
  revalidatePath("/prosecution/cases")
  return { prosecutionCaseId }
}

/** Build a prosecution case + charges + timeline + evidence from a warrant. */
async function createProsecutionCaseFromWarrant(
  warrant: typeof warrants.$inferSelect,
  actor: CurrentUser,
): Promise<string> {
  const [newCase] = await db
    .insert(cases)
    .values({
      title: warrant.suspectName ? `State v. ${warrant.suspectName}` : warrant.title,
      caseNumber: `PROS-${Date.now()}`,
      clientName: warrant.suspectName || "Unknown Defendant",
      side: "prosecution",
      status: "investigation",
      defendantName: warrant.suspectName,
      arrestingAgency: warrant.agency,
      leadOfficerId: warrant.requestingOfficerId,
      probableCause: warrant.probableCause,
      incidentNarrative: warrant.incidentSummary,
      charges: warrant.requestedCharges,
      createdById: actor.id,
    })
    .returning()

  await initializeProsecutionCaseAccess(newCase.id)

  // Charges
  if (warrant.requestedCharges) {
    const list = warrant.requestedCharges.split(",").map((c) => c.trim()).filter(Boolean)
    for (const statute of list) {
      await db.insert(prosecutionCharges).values({
        caseId: newCase.id,
        statute,
        description: `From approved warrant ${warrant.warrantNumber}`,
        status: "filed",
      })
    }
  }

  // Timeline
  const timelineRows: (typeof timelineEvents.$inferInsert)[] = []
  if (warrant.incidentDate) {
    timelineRows.push({
      caseId: newCase.id,
      date: new Date(warrant.incidentDate),
      title: "Incident occurred",
      eventType: "incident",
      description: warrant.incidentSummary ?? undefined,
      deadlineStatus: "complete",
    })
  }
  timelineRows.push({
    caseId: newCase.id,
    date: new Date(),
    title: `Warrant approved (${warrant.warrantNumber})`,
    eventType: "filing",
    description: `${warrant.title} approved by Judge ${actor.name}.`,
    deadlineStatus: "complete",
  })
  await db.insert(timelineEvents).values(timelineRows)

  // Evidence locker: warrant summary + each evidence link.
  const links = (Array.isArray(warrant.evidenceLinks) ? warrant.evidenceLinks : []) as EvidenceLink[]
  await db.insert(evidence).values({
    caseId: newCase.id,
    title: `Warrant ${warrant.warrantNumber} — application`,
    evidenceType: "document",
    description: warrant.probableCause ?? warrant.incidentSummary ?? "Approved warrant application.",
    summary: warrant.evidenceSummaries ?? null,
    status: "key_evidence",
    tags: ["warrant"],
    addedById: actor.id,
    source: "warrant",
    externalLinks: links,
  })
  for (const link of links) {
    await db.insert(evidence).values({
      caseId: newCase.id,
      title: link.label || "Warrant evidence link",
      evidenceType: "document",
      link: link.url,
      status: "pending_review",
      tags: ["warrant"],
      addedById: actor.id,
      source: "warrant",
    })
  }

  return newCase.id
}

// --- Closeout ---------------------------------------------------------------

export interface CloseoutInput {
  served: boolean
  servedAt?: string | null
  arrestLocation?: string
  arrestingOfficer?: string
  agency?: string
  defendantArrested: boolean
  evidenceRecovered: boolean
  evidenceRecoveredSummary?: string
  evidenceLinks?: EvidenceLink[]
  defendantContested: boolean
  defendantStatement: boolean
  forceUsed: boolean
  additionalCharges: boolean
  additionalChargeDetails?: string
  serviceIssues?: string
  closingNotes?: string
  recommendedNextStep?: string
}

/** Close out a warrant, record outcome, and branch into defense intake if contested. */
export async function closeOutWarrant(id: string, input: CloseoutInput) {
  const current = await requireUser()
  requirePerm(current, "warrant:close")
  const warrant = await getWarrant(id)
  if (!warrant) throw new Error("Warrant not found")

  const links = sanitizeLinks(input.evidenceLinks)
  await db.insert(warrantCloseouts).values({
    warrantId: id,
    served: input.served,
    servedAt: input.servedAt ? new Date(input.servedAt) : null,
    arrestLocation: input.arrestLocation?.trim() || null,
    arrestingOfficer: input.arrestingOfficer?.trim() || null,
    agency: input.agency?.trim() || null,
    defendantArrested: input.defendantArrested,
    evidenceRecovered: input.evidenceRecovered,
    evidenceRecoveredSummary: input.evidenceRecoveredSummary?.trim() || null,
    evidenceLinks: links,
    defendantContested: input.defendantContested,
    defendantStatement: input.defendantStatement,
    forceUsed: input.forceUsed,
    additionalCharges: input.additionalCharges,
    additionalChargeDetails: input.additionalChargeDetails?.trim() || null,
    serviceIssues: input.serviceIssues?.trim() || null,
    closingNotes: input.closingNotes?.trim() || null,
    recommendedNextStep: input.recommendedNextStep?.trim() || null,
    closedById: current.id,
    closedByName: current.name,
  })

  const newStatus = input.served ? "closed" : "warrant_returned"
  await db
    .update(warrants)
    .set({ status: newStatus, closedAt: new Date(), updatedAt: new Date() })
    .where(eq(warrants.id, id))
  await recordHistory(id, warrant.status, newStatus, current, input.closingNotes || "Warrant closed out")

  // Add closeout evidence + timeline to the linked prosecution case.
  if (warrant.linkedProsecutionCaseId) {
    await db.insert(timelineEvents).values({
      caseId: warrant.linkedProsecutionCaseId,
      date: input.servedAt ? new Date(input.servedAt) : new Date(),
      title: input.served ? "Warrant served" : "Warrant returned unserved",
      eventType: "arrest",
      description: input.closingNotes || (input.defendantArrested ? "Defendant arrested." : undefined),
      deadlineStatus: "complete",
    })
    if (input.evidenceRecovered) {
      await db.insert(evidence).values({
        caseId: warrant.linkedProsecutionCaseId,
        title: `Evidence recovered — ${warrant.warrantNumber}`,
        evidenceType: "document",
        description: input.evidenceRecoveredSummary ?? "Evidence recovered during warrant service.",
        status: "pending_review",
        tags: ["warrant", "recovered"],
        addedById: current.id,
        source: "warrant",
        externalLinks: links,
      })
    }
  }

  const settings = await getSettings("warrant")
  let defenseCaseId: string | null = warrant.linkedDefenseCaseId

  if (input.defendantContested && settings.autoCreateDefenseCase && !defenseCaseId) {
    defenseCaseId = await createDefenseCaseFromWarrant(warrant, input, current, links)
    await db.update(warrants).set({ linkedDefenseCaseId: defenseCaseId }).where(eq(warrants.id, id))
    if (settings.notifyDefenseOnContest) {
      await notifyRoles(
        ["attorney", "public_defender", "investigator", "paralegal", "admin"],
        {
          type: "warrant",
          title: "Contested warrant — defense intake",
          body: `${warrant.suspectName ?? "A defendant"} contested charges on ${warrant.warrantNumber}. A defense case was created.`,
          link: `/cases/${defenseCaseId}`,
          warrantId: id,
          caseId: defenseCaseId,
        },
      )
    }
  }

  // Notify the requesting officer of the closeout outcome.
  await createNotification({
    userId: warrant.requestingOfficerId,
    type: "warrant",
    title: `Warrant ${newStatus.replace(/_/g, " ")}`,
    body: `${warrant.warrantNumber} closeout recorded by ${current.name}.`,
    link: `/le/warrant/${id}`,
    warrantId: id,
  })

  revalidateWarrantViews(id)
  revalidatePath("/cases")
  return { defenseCaseId }
}

/** Build a defense intake case when a defendant contests charges. */
async function createDefenseCaseFromWarrant(
  warrant: typeof warrants.$inferSelect,
  closeout: CloseoutInput,
  actor: CurrentUser,
  closeoutLinks: EvidenceLink[],
): Promise<string> {
  const [newCase] = await db
    .insert(cases)
    .values({
      title: warrant.suspectName ? `State v. ${warrant.suspectName}` : warrant.title,
      caseNumber: `DEF-${Date.now()}`,
      clientName: warrant.suspectName || "Unknown Defendant",
      side: "defense",
      status: "intake",
      caseType: "criminal",
      defendantName: warrant.suspectName,
      arrestingAgency: warrant.agency,
      leadOfficerId: warrant.requestingOfficerId,
      probableCause: warrant.probableCause,
      incidentNarrative: warrant.incidentSummary,
      charges: warrant.requestedCharges,
      notes: closeout.closingNotes
        ? `Created from contested warrant ${warrant.warrantNumber}. ${closeout.closingNotes}`
        : `Created from contested warrant ${warrant.warrantNumber}.`,
      createdById: actor.id,
    })
    .returning()

  await initializeDefenseCaseAccess(newCase.id)

  // Timeline: incident, warrant approval, service/contest.
  const rows: (typeof timelineEvents.$inferInsert)[] = []
  if (warrant.incidentDate) {
    rows.push({
      caseId: newCase.id,
      date: new Date(warrant.incidentDate),
      title: "Incident occurred",
      eventType: "incident",
      description: warrant.incidentSummary ?? undefined,
      deadlineStatus: "complete",
    })
  }
  if (warrant.decidedAt) {
    rows.push({
      caseId: newCase.id,
      date: new Date(warrant.decidedAt),
      title: `Warrant approved (${warrant.warrantNumber})`,
      eventType: "filing",
      deadlineStatus: "complete",
    })
  }
  rows.push({
    caseId: newCase.id,
    date: closeout.servedAt ? new Date(closeout.servedAt) : new Date(),
    title: "Defendant contested charges",
    eventType: "arrest",
    description: closeout.closingNotes ?? "Defendant contested charges at warrant service.",
    deadlineStatus: "complete",
  })
  await db.insert(timelineEvents).values(rows)

  // Evidence: warrant application + warrant links + recovered evidence links.
  const warrantLinks = (Array.isArray(warrant.evidenceLinks) ? warrant.evidenceLinks : []) as EvidenceLink[]
  await db.insert(evidence).values({
    caseId: newCase.id,
    title: `Warrant ${warrant.warrantNumber} — application`,
    evidenceType: "document",
    description: warrant.probableCause ?? warrant.incidentSummary ?? "Warrant application.",
    summary: warrant.evidenceSummaries ?? null,
    status: "pending_review",
    tags: ["warrant"],
    addedById: actor.id,
    source: "warrant",
    externalLinks: [...warrantLinks, ...closeoutLinks],
  })

  return newCase.id
}
