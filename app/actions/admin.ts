"use server"

import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  appSettings,
  auditLogs,
  caseMessages,
  caseOptions,
  casePlanItems,
  cases,
  drafts,
  evidence,
  lawLibrary,
  leReports,
  motions,
  motionTemplates,
  notifications,
  profile,
  roles as rolesTable,
  timelineEvents,
  user,
  userRoles,
  warrants,
} from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { ensureAdminDefaults } from "@/lib/admin-seed"
import {
  DEFAULT_SETTINGS,
  getSettings,
  type SettingsKey,
  type SettingsMap,
} from "@/lib/settings"
import { APP_INTERFACE_IDS, type Role } from "@/lib/constants"

// --- Users ------------------------------------------------------------------

export interface AdminUser {
  userId: string
  name: string
  email: string
  /** Primary role (profile.role). */
  role: string
  /** All roles assigned to the user. */
  roles: string[]
  /** Admin override of accessible interface ids, or null when role-derived. */
  allowedInterfaces: string[] | null
  title: string | null
  available: boolean
  disabled: boolean
  specialties: string[]
  activeCaseCount: number
  maxActiveCases: number | null
  createdAt: Date
}

export async function listUsers(search?: string): Promise<AdminUser[]> {
  await requireAdmin()
  const where = search
    ? or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))
    : undefined
  const rows = await db
    .select({
      userId: profile.userId,
      name: user.name,
      email: user.email,
      role: profile.role,
      allowedInterfaces: profile.allowedInterfaces,
      title: profile.title,
      available: profile.available,
      disabled: profile.disabled,
      specialties: profile.specialties,
      activeCaseCount: profile.activeCaseCount,
      maxActiveCases: profile.maxActiveCases,
      createdAt: profile.createdAt,
    })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(where)
    .orderBy(asc(user.name))

  // Load all assigned roles in one query and group by user.
  const roleRows = await db
    .select({ userId: userRoles.userId, roleKey: userRoles.roleKey })
    .from(userRoles)
  const rolesByUser = new Map<string, string[]>()
  for (const r of roleRows) {
    const list = rolesByUser.get(r.userId) ?? []
    list.push(r.roleKey)
    rolesByUser.set(r.userId, list)
  }

  return rows.map((r) => {
    // Union the join-table roles with the primary role for safety.
    const assigned = rolesByUser.get(r.userId) ?? []
    const roles = Array.from(new Set([r.role, ...assigned]))
    return {
      ...r,
      specialties: r.specialties ?? [],
      roles,
      allowedInterfaces: r.allowedInterfaces ?? null,
    }
  })
}

export async function adminUpdateUser(input: {
  userId: string
  /** Display name (stored on the auth user record). */
  name?: string
  /** Single primary role (legacy). Prefer `roles` for multi-role assignment. */
  role?: string
  /** Full set of roles to assign to the user. */
  roles?: string[]
  /** Explicit allow-list of interface ids, or null to derive from roles. */
  allowedInterfaces?: string[] | null
  title?: string | null
  available?: boolean
  disabled?: boolean
  specialties?: string[]
  maxActiveCases?: number | null
}) {
  const admin = await requireAdmin()

  // Resolve the effective set of roles to assign (supports legacy `role`).
  let nextRoles: string[] | undefined =
    input.roles ?? (input.role !== undefined ? [input.role] : undefined)
  if (nextRoles !== undefined) {
    nextRoles = Array.from(new Set(nextRoles.filter(Boolean)))
    if (nextRoles.length === 0) {
      throw new Error("A user must have at least one role")
    }
  }

  // Whether this update removes admin access from the target.
  const removesAdmin = nextRoles !== undefined && !nextRoles.includes("admin")

  // Guard: never let an admin disable or demote the last remaining admin.
  if (removesAdmin || input.disabled === true) {
    const [target] = await db
      .select({ role: profile.role })
      .from(profile)
      .where(eq(profile.userId, input.userId))
      .limit(1)
    if (target?.role === "admin") {
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(profile)
        .where(and(eq(profile.role, "admin"), eq(profile.disabled, false)))
      if (Number(n) <= 1) {
        throw new Error("You cannot remove or disable the last active admin")
      }
    }
  }

  // The primary role keeps "admin" first when held, so the count-based
  // last-admin guard above (which reads profile.role) stays accurate.
  const primaryRole =
    nextRoles !== undefined
      ? nextRoles.includes("admin")
        ? "admin"
        : nextRoles[0]
      : undefined

  // Normalize the allowed-interfaces override to a valid subset or null.
  let allowedInterfaces: string[] | null | undefined
  if (input.allowedInterfaces !== undefined) {
    allowedInterfaces =
      input.allowedInterfaces === null
        ? null
        : input.allowedInterfaces.filter((id) =>
            APP_INTERFACE_IDS.includes(id as (typeof APP_INTERFACE_IDS)[number]),
          )
  }

  await db
    .update(profile)
    .set({
      ...(primaryRole !== undefined ? { role: primaryRole } : {}),
      ...(allowedInterfaces !== undefined ? { allowedInterfaces } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.available !== undefined ? { available: input.available } : {}),
      ...(input.disabled !== undefined ? { disabled: input.disabled } : {}),
      ...(input.specialties !== undefined ? { specialties: input.specialties } : {}),
      ...(input.maxActiveCases !== undefined
        ? { maxActiveCases: input.maxActiveCases }
        : {}),
    })
    .where(eq(profile.userId, input.userId))

  // Update the display name on the auth user record.
  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) throw new Error("Name cannot be empty")
    await db.update(user).set({ name }).where(eq(user.id, input.userId))
  }

  // Sync the role join table to match the requested set of roles.
  if (nextRoles !== undefined) {
    await db.delete(userRoles).where(eq(userRoles.userId, input.userId))
    await db
      .insert(userRoles)
      .values(nextRoles.map((roleKey) => ({ userId: input.userId, roleKey })))
      .onConflictDoNothing()
  }

  // Suspending a user takes effect immediately: revoke their active sessions.
  if (input.disabled === true) {
    const ctx = await auth.$context
    const sessions = await ctx.internalAdapter.listSessions(input.userId)
    if (sessions.length > 0) {
      await ctx.internalAdapter.deleteSessions(sessions.map((s) => s.token))
    }
  }

  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: input.disabled === true ? "user.suspend" : "user.update",
    category: "user",
    targetType: "user",
    targetId: input.userId,
    summary: input.disabled === true ? "Suspended user account" : "Updated user account",
    metadata: input as Record<string, unknown>,
  })

  revalidatePath("/admin/users")
  revalidatePath("/team")
}

export async function adminResetUserPassword(input: {
  userId: string
  newPassword: string
}) {
  const admin = await requireAdmin()

  const password = input.newPassword
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters")
  }
  if (password.length > 128) {
    throw new Error("Password must be 128 characters or fewer")
  }

  const [target] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, input.userId))
    .limit(1)
  if (!target) throw new Error("User not found")

  const ctx = await auth.$context
  const hashed = await ctx.password.hash(password)
  await ctx.internalAdapter.updatePassword(input.userId, hashed)

  // Force re-authentication everywhere by revoking the user's sessions.
  const sessions = await ctx.internalAdapter.listSessions(input.userId)
  if (sessions.length > 0) {
    await ctx.internalAdapter.deleteSessions(sessions.map((s) => s.token))
  }

  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "user.reset_password",
    category: "auth",
    targetType: "user",
    targetId: input.userId,
    summary: `Reset password for ${target.email}`,
  })
}

export async function adminDeleteUser(input: { userId: string }) {
  const admin = await requireAdmin()

  if (input.userId === admin.id) {
    throw new Error("You cannot delete your own account")
  }

  const [target] = await db
    .select({ role: profile.role, name: user.name, email: user.email })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(eq(profile.userId, input.userId))
    .limit(1)
  if (!target) throw new Error("User not found")

  // Never allow deleting the last remaining active admin.
  if (target.role === "admin") {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(profile)
      .where(and(eq(profile.role, "admin"), eq(profile.disabled, false)))
    if (Number(n) <= 1) {
      throw new Error("You cannot delete the last active admin")
    }
  }

  // This is a shared-office model: case data outlives individual members.
  // Reassign required authorship to the acting admin and clear optional
  // assignment references, then remove the account.
  await db.transaction(async (tx) => {
    await tx
      .update(cases)
      .set({ assignedAttorneyId: null })
      .where(eq(cases.assignedAttorneyId, input.userId))
    await tx
      .update(cases)
      .set({ assignedParalegalId: null })
      .where(eq(cases.assignedParalegalId, input.userId))
    await tx
      .update(cases)
      .set({ createdById: admin.id })
      .where(eq(cases.createdById, input.userId))
    await tx
      .update(timelineEvents)
      .set({ responsibleUserId: null })
      .where(eq(timelineEvents.responsibleUserId, input.userId))
    await tx
      .update(casePlanItems)
      .set({ ownerId: null })
      .where(eq(casePlanItems.ownerId, input.userId))
    await tx
      .update(evidence)
      .set({ addedById: admin.id })
      .where(eq(evidence.addedById, input.userId))
    await tx
      .update(drafts)
      .set({ createdById: admin.id })
      .where(eq(drafts.createdById, input.userId))
    await tx
      .update(caseMessages)
      .set({ authorId: admin.id })
      .where(eq(caseMessages.authorId, input.userId))

    // profile has no FK, so remove it explicitly. Deleting the user row
    // cascades to its sessions and accounts.
    await tx.delete(profile).where(eq(profile.userId, input.userId))
    await tx.delete(user).where(eq(user.id, input.userId))
  })

  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "user.delete",
    category: "user",
    targetType: "user",
    targetId: input.userId,
    summary: `Deleted user ${target.email}`,
  })

  revalidatePath("/admin/users")
  revalidatePath("/team")
}

// --- Roles ------------------------------------------------------------------

export async function listRoles() {
  await requireAdmin()
  await ensureAdminDefaults()
  return db
    .select()
    .from(rolesTable)
    .orderBy(asc(rolesTable.sortOrder), asc(rolesTable.label))
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export async function createRole(input: {
  label: string
  description?: string
  permissions: string[]
  isCounsel?: boolean
  adminAccess?: boolean
}) {
  const admin = await requireAdmin()
  const key = slugify(input.label)
  if (!key) throw new Error("Role name is required")
  const [exists] = await db
    .select({ id: rolesTable.id })
    .from(rolesTable)
    .where(eq(rolesTable.key, key))
    .limit(1)
  if (exists) throw new Error("A role with that name already exists")

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${rolesTable.sortOrder}), 0)::int` })
    .from(rolesTable)

  await db.insert(rolesTable).values({
    key,
    label: input.label.trim(),
    description: input.description?.trim() || null,
    permissions: input.permissions,
    isCounsel: input.isCounsel ?? false,
    adminAccess: input.adminAccess ?? false,
    isSystem: false,
    sortOrder: Number(max) + 1,
  })

  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "role.create",
    category: "role",
    targetType: "role",
    targetId: key,
    summary: `Created role "${input.label}"`,
  })
  revalidatePath("/admin/roles")
}

export async function updateRole(input: {
  id: string
  label?: string
  description?: string | null
  permissions?: string[]
  isCounsel?: boolean
  adminAccess?: boolean
}) {
  const admin = await requireAdmin()
  const [role] = await db
    .select()
    .from(rolesTable)
    .where(eq(rolesTable.id, input.id))
    .limit(1)
  if (!role) throw new Error("Role not found")

  // Prevent removing admin access from the admin system role.
  if (role.key === "admin" && input.adminAccess === false) {
    throw new Error("The Admin role must keep admin access")
  }

  await db
    .update(rolesTable)
    .set({
      ...(input.label !== undefined ? { label: input.label.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.permissions !== undefined ? { permissions: input.permissions } : {}),
      ...(input.isCounsel !== undefined ? { isCounsel: input.isCounsel } : {}),
      ...(input.adminAccess !== undefined ? { adminAccess: input.adminAccess } : {}),
    })
    .where(eq(rolesTable.id, input.id))

  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "role.update",
    category: "role",
    targetType: "role",
    targetId: role.key,
    summary: `Updated role "${role.label}"`,
    metadata: { permissions: input.permissions },
  })
  revalidatePath("/admin/roles")
  revalidatePath("/admin/users")
}

export async function deleteRole(id: string) {
  const admin = await requireAdmin()
  const [role] = await db
    .select()
    .from(rolesTable)
    .where(eq(rolesTable.id, id))
    .limit(1)
  if (!role) return
  if (role.isSystem) throw new Error("Built-in roles cannot be deleted")

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(profile)
    .where(eq(profile.role, role.key))
  if (Number(n) > 0) {
    throw new Error(
      `This role is assigned to ${n} member(s). Reassign them before deleting.`,
    )
  }

  await db.delete(rolesTable).where(eq(rolesTable.id, id))
  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "role.delete",
    category: "role",
    targetType: "role",
    targetId: role.key,
    summary: `Deleted role "${role.label}"`,
  })
  revalidatePath("/admin/roles")
}

// --- Case options (configurable lists) --------------------------------------

export type OptionRow = typeof caseOptions.$inferSelect

export async function listOptions(category: string) {
  await requireAdmin()
  await ensureAdminDefaults()
  return db
    .select()
    .from(caseOptions)
    .where(eq(caseOptions.category, category))
    .orderBy(asc(caseOptions.sortOrder), asc(caseOptions.label))
}

export async function listAllOptions() {
  await requireAdmin()
  await ensureAdminDefaults()
  return db
    .select()
    .from(caseOptions)
    .orderBy(asc(caseOptions.category), asc(caseOptions.sortOrder))
}

export async function addOption(input: {
  category: string
  label: string
  value?: string
}) {
  const admin = await requireAdmin()
  const value = input.value?.trim() || slugify(input.label)
  if (!value) throw new Error("A label is required")
  const [exists] = await db
    .select({ id: caseOptions.id })
    .from(caseOptions)
    .where(and(eq(caseOptions.category, input.category), eq(caseOptions.value, value)))
    .limit(1)
  if (exists) throw new Error("That option already exists")

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${caseOptions.sortOrder}), 0)::int` })
    .from(caseOptions)
    .where(eq(caseOptions.category, input.category))

  const [created] = await db
    .insert(caseOptions)
    .values({
      category: input.category,
      value,
      label: input.label.trim(),
      sortOrder: Number(max) + 1,
      active: true,
    })
    .returning()
  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "option.create",
    category: "system",
    targetType: "case_option",
    targetId: `${input.category}:${value}`,
    summary: `Added "${input.label}" to ${input.category}`,
  })
  revalidatePath("/admin/case-settings")
  revalidatePath("/admin/evidence-settings")
  revalidatePath("/admin/timeline-settings")
  revalidatePath("/", "layout")
  return created
}

export async function updateOption(input: {
  id: string
  label?: string
  active?: boolean
  sortOrder?: number
}) {
  await requireAdmin()
  await db
    .update(caseOptions)
    .set({
      ...(input.label !== undefined ? { label: input.label.trim() } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    })
    .where(eq(caseOptions.id, input.id))
  revalidatePath("/admin/case-settings")
}

export async function deleteOption(id: string) {
  await requireAdmin()
  await db.delete(caseOptions).where(eq(caseOptions.id, id))
  revalidatePath("/admin/case-settings")
}

export async function reorderOptions(ids: string[]) {
  await requireAdmin()
  await Promise.all(
    ids.map((id, i) =>
      db.update(caseOptions).set({ sortOrder: i }).where(eq(caseOptions.id, id)),
    ),
  )
  revalidatePath("/admin/case-settings")
}

// --- Settings groups --------------------------------------------------------

export async function getSettingsForAdmin<K extends SettingsKey>(
  key: K,
): Promise<SettingsMap[K]> {
  await requireAdmin()
  return getSettings(key)
}

export async function saveSettings<K extends SettingsKey>(
  key: K,
  value: Partial<SettingsMap[K]>,
) {
  const admin = await requireAdmin()
  const merged = { ...DEFAULT_SETTINGS[key], ...value }
  await db
    .insert(appSettings)
    .values({ key, value: merged, updatedBy: admin.id, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: merged, updatedBy: admin.id, updatedAt: new Date() },
    })
  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "settings.update",
    category: "system",
    targetType: "settings",
    targetId: key,
    summary: `Updated ${key} settings`,
  })
  revalidatePath("/admin", "layout")
  revalidatePath("/", "layout")
}

// --- Motion templates -------------------------------------------------------

export type TemplateRow = typeof motionTemplates.$inferSelect

export async function listTemplates() {
  await requireAdmin()
  await ensureAdminDefaults()
  return db
    .select()
    .from(motionTemplates)
    .orderBy(asc(motionTemplates.sortOrder), asc(motionTemplates.name))
}

export async function createTemplate(input: {
  name: string
  category: string
  description?: string
  content: string
}) {
  const admin = await requireAdmin()
  if (!input.name.trim()) throw new Error("Template name is required")
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${motionTemplates.sortOrder}), 0)::int` })
    .from(motionTemplates)
  await db.insert(motionTemplates).values({
    name: input.name.trim(),
    category: input.category,
    description: input.description?.trim() || null,
    content: input.content,
    isSystem: false,
    active: true,
    sortOrder: Number(max) + 1,
  })
  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "template.create",
    category: "template",
    targetType: "template",
    summary: `Created template "${input.name}"`,
  })
  revalidatePath("/admin/templates")
}

export async function updateTemplate(input: {
  id: string
  name?: string
  category?: string
  description?: string | null
  content?: string
  active?: boolean
}) {
  await requireAdmin()
  await db
    .update(motionTemplates)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      updatedAt: new Date(),
    })
    .where(eq(motionTemplates.id, input.id))
  revalidatePath("/admin/templates")
}

export async function deleteTemplate(id: string) {
  await requireAdmin()
  await db.delete(motionTemplates).where(eq(motionTemplates.id, id))
  revalidatePath("/admin/templates")
}

// --- Audit logs -------------------------------------------------------------

export async function listAuditLogs(input?: {
  category?: string
  search?: string
  limit?: number
}) {
  await requireAdmin()
  const conditions = []
  if (input?.category && input.category !== "all") {
    conditions.push(eq(auditLogs.category, input.category))
  }
  if (input?.search) {
    conditions.push(
      or(
        ilike(auditLogs.summary, `%${input.search}%`),
        ilike(auditLogs.actorName, `%${input.search}%`),
        ilike(auditLogs.action, `%${input.search}%`),
      ),
    )
  }
  return db
    .select()
    .from(auditLogs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(input?.limit ?? 200)
}

// --- Overview stats ---------------------------------------------------------

export async function getAdminStats() {
  await requireAdmin()
  const [users] = await db.select({ n: sql<number>`count(*)::int` }).from(profile)
  const [disabled] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(profile)
    .where(eq(profile.disabled, true))
  const [admins] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(profile)
    .where(eq(profile.role, "admin"))
  const [caseCount] = await db.select({ n: sql<number>`count(*)::int` }).from(cases)
  const [roleCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(rolesTable)
  const [tplCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(motionTemplates)
  return {
    users: Number(users.n),
    disabledUsers: Number(disabled.n),
    admins: Number(admins.n),
    cases: Number(caseCount.n),
    roles: Number(roleCount.n),
    templates: Number(tplCount.n),
  }
}

export interface SystemHealth {
  generatedAt: string
  database: { ok: boolean; latencyMs: number }
  records: {
    users: number
    activeUsers: number
    disabledUsers: number
    cases: number
    openCases: number
    motions: number
    pendingMotions: number
    warrants: number
    pendingWarrants: number
    reports: number
    evidence: number
    timelineEvents: number
    knowledgeEntries: number
    memoryBankEntries: number
    aiEnabledEntries: number
  }
  notifications: { total: number; unread: number }
  activity: { last24h: number; last7d: number }
  recentCritical: { id: string; summary: string; actorName: string | null; createdAt: Date }[]
}

const one = (rows: { n: number }[]) => Number(rows[0]?.n ?? 0)

/**
 * Aggregate system-wide counts and a database health probe for the admin
 * System Health dashboard. Runs the independent count queries in parallel.
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  await requireAdmin()

  const started = Date.now()
  let dbOk = true
  try {
    await db.execute(sql`select 1`)
  } catch {
    dbOk = false
  }
  const latencyMs = Date.now() - started

  const count = (table: any, where?: any) => {
    const q = db.select({ n: sql<number>`count(*)::int` }).from(table)
    return where ? q.where(where) : q
  }

  const [
    users,
    activeUsers,
    disabledUsers,
    caseCount,
    openCases,
    motionCount,
    pendingMotions,
    warrantCount,
    pendingWarrants,
    reportCount,
    evidenceCount,
    timelineCount,
    knowledgeCount,
    memoryCount,
    aiEnabledCount,
    notifTotal,
    notifUnread,
    activity24h,
    activity7d,
    recentCritical,
  ] = await Promise.all([
    count(profile),
    count(profile, eq(profile.disabled, false)),
    count(profile, eq(profile.disabled, true)),
    count(cases),
    count(cases, sql`${cases.status} not in ('closed','dismissed','resolved')`),
    count(motions),
    count(motions, sql`${motions.status} in ('submitted','under_review','needs_more_info')`),
    count(warrants),
    count(warrants, sql`${warrants.status} in ('submitted','under_review')`),
    count(leReports),
    count(evidence),
    count(timelineEvents),
    count(lawLibrary),
    count(lawLibrary, eq(lawLibrary.entryKind, "memory_bank")),
    count(lawLibrary, and(eq(lawLibrary.aiEnabled, true), eq(lawLibrary.status, "active"))),
    count(notifications),
    count(notifications, sql`${notifications.readAt} is null`),
    count(auditLogs, sql`${auditLogs.createdAt} > now() - interval '24 hours'`),
    count(auditLogs, sql`${auditLogs.createdAt} > now() - interval '7 days'`),
    db
      .select({
        id: auditLogs.id,
        summary: auditLogs.summary,
        actorName: auditLogs.actorName,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(sql`${auditLogs.category} in ('security','auth','admin','warrant','system')`)
      .orderBy(desc(auditLogs.createdAt))
      .limit(8),
  ])

  return {
    generatedAt: new Date().toISOString(),
    database: { ok: dbOk, latencyMs },
    records: {
      users: one(users),
      activeUsers: one(activeUsers),
      disabledUsers: one(disabledUsers),
      cases: one(caseCount),
      openCases: one(openCases),
      motions: one(motionCount),
      pendingMotions: one(pendingMotions),
      warrants: one(warrantCount),
      pendingWarrants: one(pendingWarrants),
      reports: one(reportCount),
      evidence: one(evidenceCount),
      timelineEvents: one(timelineCount),
      knowledgeEntries: one(knowledgeCount),
      memoryBankEntries: one(memoryCount),
      aiEnabledEntries: one(aiEnabledCount),
    },
    notifications: { total: one(notifTotal), unread: one(notifUnread) },
    activity: { last24h: one(activity24h), last7d: one(activity7d) },
    recentCritical: recentCritical as SystemHealth["recentCritical"],
  }
}
