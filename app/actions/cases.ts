"use server"

import { and, desc, eq, ne, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  cases,
  profile,
  user,
  roles,
  evidence,
  timelineEvents,
  casePlanItems,
  filingDeadlines,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { labelOf, CASE_TYPES } from "@/lib/constants"
import { getSettings } from "@/lib/settings"
import { logAudit } from "@/lib/audit"
import { autoAssign, type Candidate, type AutoAssignOptions } from "@/lib/assign"

export interface CaseRow {
  id: string
  title: string
  caseNumber: string
  clientName: string
  charges: string | null
  caseType: string
  priority: string
  status: string
  assignedAttorneyId: string | null
  assignedParalegalId: string | null
  attorneyName: string | null
  paralegalName: string | null
  courtDate: Date | null
  conflictFlag: boolean
  createdAt: Date
  updatedAt: Date
}

function genCaseNumber() {
  const year = new Date().getFullYear()
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `CR-${year}-${rand}`
}

async function loadCandidates(): Promise<Candidate[]> {
  const rows = await db
    .select({
      userId: profile.userId,
      name: user.name,
      role: profile.role,
      available: profile.available,
      activeCaseCount: profile.activeCaseCount,
      specialties: profile.specialties,
      maxActiveCases: profile.maxActiveCases,
      disabled: profile.disabled,
    })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))

  return rows
    .filter((r) => !r.disabled)
    .map((r) => ({
      userId: r.userId,
      name: r.name,
      role: r.role as Candidate["role"],
      available: r.available,
      activeCaseCount: r.activeCaseCount,
      specialties: r.specialties ?? [],
      maxActiveCases: r.maxActiveCases,
    }))
}

/** Build auto-assignment options from saved settings + DB-driven roles. */
async function loadAssignOptions(): Promise<AutoAssignOptions> {
  const [settings, roleRows] = await Promise.all([
    getSettings("auto_assign"),
    db.select().from(roles),
  ])
  const counselRoles = roleRows.filter((r) => r.isCounsel).map((r) => r.key)
  const paralegalRoles = roleRows
    .filter((r) => !r.isCounsel && r.key === "paralegal")
    .map((r) => r.key)
  return {
    enabled: settings.enabled,
    byCaseType: settings.byCaseType,
    byPriority: settings.byPriority,
    byAvailability: settings.byAvailability,
    byWorkload: settings.byWorkload,
    conflictCheck: settings.conflictCheck,
    maxActiveCasesDefault: settings.maxActiveCasesDefault,
    counselRoles: counselRoles.length
      ? counselRoles
      : ["attorney", "public_defender"],
    paralegalRoles: paralegalRoles.length ? paralegalRoles : ["paralegal"],
  }
}

export async function listCases(filter?: {
  assignedTo?: string
  status?: string
  search?: string
}): Promise<CaseRow[]> {
  await requireUser()

  const attorney = user
  const conds = []
  if (filter?.assignedTo) {
    conds.push(
      or(
        eq(cases.assignedAttorneyId, filter.assignedTo),
        eq(cases.assignedParalegalId, filter.assignedTo),
      ),
    )
  }
  if (filter?.status) conds.push(eq(cases.status, filter.status))

  const rows = await db
    .select({
      id: cases.id,
      title: cases.title,
      caseNumber: cases.caseNumber,
      clientName: cases.clientName,
      charges: cases.charges,
      caseType: cases.caseType,
      priority: cases.priority,
      status: cases.status,
      assignedAttorneyId: cases.assignedAttorneyId,
      assignedParalegalId: cases.assignedParalegalId,
      attorneyName: attorney.name,
      courtDate: cases.courtDate,
      conflictFlag: cases.conflictFlag,
      createdAt: cases.createdAt,
      updatedAt: cases.updatedAt,
    })
    .from(cases)
    .leftJoin(attorney, eq(attorney.id, cases.assignedAttorneyId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(cases.updatedAt))

  // Resolve paralegal names in a second pass.
  const paralegalIds = [
    ...new Set(rows.map((r) => r.assignedParalegalId).filter(Boolean) as string[]),
  ]
  const paralegalMap = new Map<string, string>()
  if (paralegalIds.length) {
    const pls = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(or(...paralegalIds.map((id) => eq(user.id, id))))
    pls.forEach((p) => paralegalMap.set(p.id, p.name))
  }

  let result = rows.map((r) => ({
    ...r,
    paralegalName: r.assignedParalegalId
      ? paralegalMap.get(r.assignedParalegalId) ?? null
      : null,
  }))

  if (filter?.search) {
    const q = filter.search.toLowerCase()
    result = result.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q) ||
        c.caseNumber.toLowerCase().includes(q) ||
        (c.charges ?? "").toLowerCase().includes(q),
    )
  }

  return result
}

export async function getCase(id: string) {
  await requireUser()
  const [row] = await db.select().from(cases).where(eq(cases.id, id)).limit(1)
  if (!row) return null

  const names = new Map<string, string>()
  const ids = [row.assignedAttorneyId, row.assignedParalegalId].filter(
    Boolean,
  ) as string[]
  if (ids.length) {
    const us = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(or(...ids.map((i) => eq(user.id, i))))
    us.forEach((u) => names.set(u.id, u.name))
  }

  return {
    ...row,
    attorneyName: row.assignedAttorneyId
      ? names.get(row.assignedAttorneyId) ?? null
      : null,
    paralegalName: row.assignedParalegalId
      ? names.get(row.assignedParalegalId) ?? null
      : null,
  }
}

export async function createCase(input: {
  title: string
  clientName: string
  charges?: string
  caseType: string
  priority: string
  notes?: string
  conflictFlag?: boolean
}) {
  const current = await requireUser()
  if (!current.permissions.includes("case:create")) {
    throw new Error("You do not have permission to create cases")
  }

  const [candidates, assignOptions] = await Promise.all([
    loadCandidates(),
    loadAssignOptions(),
  ])
  const assignment = autoAssign(
    candidates,
    {
      caseType: input.caseType,
      priority: input.priority,
      conflictFlag: input.conflictFlag ?? false,
      specialtyHints: [
        labelOf(CASE_TYPES, input.caseType),
        input.charges ?? "",
      ].filter(Boolean),
    },
    assignOptions,
  )

  const [created] = await db
    .insert(cases)
    .values({
      title: input.title,
      caseNumber: genCaseNumber(),
      clientName: input.clientName,
      charges: input.charges ?? null,
      caseType: input.caseType,
      priority: input.priority,
      status: "intake",
      notes: input.notes ?? null,
      conflictFlag: input.conflictFlag ?? false,
      assignedAttorneyId: assignment.counsel?.userId ?? null,
      assignedParalegalId: assignment.paralegal?.userId ?? null,
      createdById: current.id,
    })
    .returning()

  await refreshCounts()
  await logAudit({
    actorId: current.id,
    actorName: current.name,
    action: "case.create",
    category: "case",
    targetType: "case",
    targetId: created.id,
    summary: `Created case "${created.title}" (${created.caseNumber})`,
  })
  revalidatePath("/cases")
  revalidatePath("/dashboard")
  revalidatePath("/my-cases")

  return { id: created.id, assignment }
}

export async function updateCase(
  id: string,
  input: Partial<{
    title: string
    clientName: string
    charges: string | null
    caseType: string
    priority: string
    status: string
    notes: string | null
    strategySummary: string | null
    conflictFlag: boolean
    courtDate: Date | null
  }>,
) {
  const current = await requireUser()
  if (!current.permissions.includes("case:edit")) {
    throw new Error("You do not have permission to edit cases")
  }
  await db
    .update(cases)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(cases.id, id))

  if (input.status) await refreshCounts()
  revalidatePath(`/cases/${id}`)
  revalidatePath("/cases")
  revalidatePath("/dashboard")
}

/**
 * Staff action: close a case. Clears any pending closure request, sets the
 * status to "closed", and stamps the closed timestamp. Reason is optional.
 */
export async function closeCase(
  id: string,
  input?: { reason?: string },
) {
  const current = await requireUser()
  if (!current.permissions.includes("case:edit")) {
    throw new Error("You do not have permission to close cases")
  }
  const [existing] = await db
    .select({ status: cases.status, closureReason: cases.closureReason })
    .from(cases)
    .where(eq(cases.id, id))
    .limit(1)
  if (!existing) throw new Error("Case not found")

  await db
    .update(cases)
    .set({
      status: "closed",
      closedAt: new Date(),
      closureRequested: false,
      closureReason: input?.reason
        ? input.reason.slice(0, 1000)
        : existing.closureReason,
      updatedAt: new Date(),
    })
    .where(eq(cases.id, id))

  await refreshCounts()
  await logAudit({
    actorId: current.id,
    actorName: current.name,
    action: "case.close",
    category: "case",
    targetType: "case",
    targetId: id,
    summary: `Closed case`,
  })
  revalidatePath(`/cases/${id}`)
  revalidatePath("/cases")
  revalidatePath("/case-depot")
  revalidatePath("/dashboard")
  revalidatePath(`/portal/cases/${id}`)
}

/** Staff action: reopen a closed case back into the active workflow. */
export async function reopenCase(id: string) {
  const current = await requireUser()
  if (!current.permissions.includes("case:edit")) {
    throw new Error("You do not have permission to reopen cases")
  }
  await db
    .update(cases)
    .set({
      status: "investigation",
      closedAt: null,
      closureRequested: false,
      closureReason: null,
      updatedAt: new Date(),
    })
    .where(eq(cases.id, id))

  await refreshCounts()
  await logAudit({
    actorId: current.id,
    actorName: current.name,
    action: "case.reopen",
    category: "case",
    targetType: "case",
    targetId: id,
    summary: `Reopened case`,
  })
  revalidatePath(`/cases/${id}`)
  revalidatePath("/cases")
  revalidatePath("/case-depot")
  revalidatePath("/dashboard")
  revalidatePath(`/portal/cases/${id}`)
}

/** Staff action: dismiss a client's pending closure request without closing. */
export async function dismissClosureRequest(id: string) {
  const current = await requireUser()
  if (!current.permissions.includes("case:edit")) {
    throw new Error("You do not have permission to manage closure requests")
  }
  await db
    .update(cases)
    .set({
      closureRequested: false,
      closureRequestedAt: null,
      closureRequestedById: null,
      closureReason: null,
      updatedAt: new Date(),
    })
    .where(eq(cases.id, id))

  await logAudit({
    actorId: current.id,
    actorName: current.name,
    action: "case.closure_dismissed",
    category: "case",
    targetType: "case",
    targetId: id,
    summary: `Dismissed client closure request`,
  })
  revalidatePath(`/cases/${id}`)
}

export async function assignCase(
  id: string,
  input: { attorneyId?: string | null; paralegalId?: string | null },
) {
  const current = await requireUser()
  if (!current.permissions.includes("case:assign")) {
    throw new Error("You do not have permission to assign cases")
  }
  await db
    .update(cases)
    .set({
      ...(input.attorneyId !== undefined
        ? { assignedAttorneyId: input.attorneyId }
        : {}),
      ...(input.paralegalId !== undefined
        ? { assignedParalegalId: input.paralegalId }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(cases.id, id))

  await refreshCounts()
  await logAudit({
    actorId: current.id,
    actorName: current.name,
    action: "case.assign",
    category: "case",
    targetType: "case",
    targetId: id,
    summary: `Updated case assignment`,
    metadata: { attorneyId: input.attorneyId, paralegalId: input.paralegalId },
  })
  revalidatePath(`/cases/${id}`)
  revalidatePath("/cases")
  revalidatePath("/my-cases")
}

/** Re-run the auto-assignment engine for an existing case and return ranking. */
export async function suggestAssignment(id: string) {
  await requireUser()
  const [c] = await db.select().from(cases).where(eq(cases.id, id)).limit(1)
  if (!c) throw new Error("Case not found")
  const [candidates, assignOptions] = await Promise.all([
    loadCandidates(),
    loadAssignOptions(),
  ])
  return autoAssign(
    candidates,
    {
      caseType: c.caseType,
      priority: c.priority,
      conflictFlag: c.conflictFlag,
      specialtyHints: [labelOf(CASE_TYPES, c.caseType), c.charges ?? ""].filter(
        Boolean,
      ),
    },
    assignOptions,
  )
}

export async function deleteCase(id: string) {
  const current = await requireUser()
  if (!current.permissions.includes("case:delete")) {
    throw new Error("You do not have permission to delete cases")
  }
  const [existing] = await db.select().from(cases).where(eq(cases.id, id)).limit(1)
  await db.delete(evidence).where(eq(evidence.caseId, id))
  await db.delete(timelineEvents).where(eq(timelineEvents.caseId, id))
  await db.delete(casePlanItems).where(eq(casePlanItems.caseId, id))
  await db.delete(filingDeadlines).where(eq(filingDeadlines.caseId, id))
  await db.delete(cases).where(eq(cases.id, id))
  await refreshCounts()
  await logAudit({
    actorId: current.id,
    actorName: current.name,
    action: "case.delete",
    category: "case",
    targetType: "case",
    targetId: id,
    summary: `Deleted case "${existing?.title ?? id}"`,
  })
  revalidatePath("/cases")
  revalidatePath("/dashboard")
}

/** Recompute activeCaseCount for all members (open assignments only). */
async function refreshCounts() {
  const members = await db.select({ userId: profile.userId }).from(profile)
  for (const m of members) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(cases)
      .where(
        and(
          ne(cases.status, "closed"),
          or(
            eq(cases.assignedAttorneyId, m.userId),
            eq(cases.assignedParalegalId, m.userId),
          ),
        ),
      )
    await db
      .update(profile)
      .set({ activeCaseCount: Number(n ?? 0) })
      .where(eq(profile.userId, m.userId))
  }
}
