import "server-only"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profile, user, userRoles } from "@/lib/db/schema"
import type { AppInterface, Permission, Role } from "@/lib/constants"
import {
  computeAllowedInterfaces,
  homePathForInterface,
  interfaceForRole,
} from "@/lib/constants"
import {
  permissionsForRoles,
  rolesHaveAdminAccess,
} from "@/lib/permissions"

// Re-exported for back-compat with existing imports.
export type { AppInterface }
export { interfaceForRole }

/** The landing path for a user based on their (primary) role's interface. */
export function homePathForRole(role: Role): string {
  return homePathForInterface(interfaceForRole(role))
}

export interface CurrentUser {
  id: string
  name: string
  email: string
  /** Primary/default role (from the profile row). */
  role: Role
  /** All roles assigned to this user. */
  roles: Role[]
  title: string | null
  available: boolean
  specialties: string[]
  activeCaseCount: number
  disabled: boolean
  /** Union of effective, DB-driven permissions across all of the user's roles. */
  permissions: string[]
  /** Whether any of this user's roles can access the admin panel. */
  adminAccess: boolean
  /** Interfaces this user may access (after admin restrictions). */
  interfaces: AppInterface[]
  /** Admin override list of allowed interface ids, or null when role-derived. */
  allowedInterfaces: string[] | null
  /** The interface the user last viewed (if still accessible). */
  lastInterface: AppInterface | null
}

/** The landing path for a user, honoring their last-used interface. */
export function homePathForUser(current: CurrentUser): string {
  if (current.interfaces.length === 0) return "/access-denied"
  const last = current.lastInterface
  if (last && current.interfaces.includes(last)) return homePathForInterface(last)
  return homePathForInterface(current.interfaces[0])
}

/** Returns the current session user, or null if not signed in. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

/**
 * For API routes: get current user without redirecting. Returns null if not auth'd.
 * API routes must handle auth errors by returning Response objects, not redirecting.
 */
export async function getCurrentUserSafe(): Promise<CurrentUser | null> {
  try {
    return await getCurrentUser()
  } catch {
    return null
  }
}

/**
 * Returns the signed-in user joined with their profile. Auto-creates a profile
 * row on first access. The very first user to sign up becomes an admin.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession()
  if (!session?.user) return null

  let [row] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, session.user.id))
    .limit(1)

  if (!row) {
    // First-ever user becomes admin (bootstrap); every other new user starts
    // as an external client. Staff are promoted by an admin afterwards.
    const existing = await db.select({ userId: profile.userId }).from(profile).limit(1)
    const isFirst = existing.length === 0
    const primaryRole = isFirst ? "admin" : "civilian"
    const [created] = await db
      .insert(profile)
      .values({
        userId: session.user.id,
        role: primaryRole,
      })
      .returning()
    row = created
    // Seed the join table so the user's primary role is also a held role.
    await db
      .insert(userRoles)
      .values({ userId: session.user.id, roleKey: primaryRole })
      .onConflictDoNothing()
  }

  // The user's full role set is the union of their primary role and any
  // additional roles recorded in the join table.
  const roleRows = await db
    .select({ roleKey: userRoles.roleKey })
    .from(userRoles)
    .where(eq(userRoles.userId, session.user.id))
  const roleKeys = Array.from(
    new Set<string>([row.role, ...roleRows.map((r) => r.roleKey)]),
  )

  const [permissions, adminAccess] = await Promise.all([
    permissionsForRoles(roleKeys),
    rolesHaveAdminAccess(roleKeys),
  ])

  const allowedInterfaces = row.allowedInterfaces ?? null
  const interfaces = computeAllowedInterfaces({
    roles: roleKeys,
    adminAccess,
    allowedInterfaces,
  })
  const lastInterface =
    row.lastInterface && interfaces.includes(row.lastInterface as AppInterface)
      ? (row.lastInterface as AppInterface)
      : null

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: row.role as Role,
    roles: roleKeys as Role[],
    title: row.title,
    available: row.available,
    specialties: row.specialties ?? [],
    activeCaseCount: row.activeCaseCount,
    disabled: row.disabled,
    permissions,
    adminAccess,
    interfaces,
    allowedInterfaces,
    lastInterface,
  }
}

/** Requires a signed-in, non-suspended user; redirects otherwise. */
export async function requireUser(): Promise<CurrentUser> {
  const current = await getCurrentUser()
  if (!current) redirect("/sign-in")
  if (current.disabled) redirect("/suspended")
  return current
}

/** True if the user can access the external informant portal. */
export function isCivilian(current: CurrentUser): boolean {
  return current.interfaces.includes("portal")
}

/**
 * Requires a signed-in user who has access to the given interface. Users who
 * lack access are redirected to one of their own interfaces, or to the
 * access-denied page if they have none.
 */
export async function requireInterface(
  target: AppInterface,
): Promise<CurrentUser> {
  const current = await requireUser()
  if (!current.interfaces.includes(target)) redirect(homePathForUser(current))
  return current
}

/** Requires access to the internal defense (app) interface. */
export async function requireStaff(): Promise<CurrentUser> {
  return requireInterface("app")
}

/** Requires access to the external informant portal. Guards the (portal) interface. */
export async function requireCivilian(): Promise<CurrentUser> {
  return requireInterface("portal")
}

/** Requires access to the Law Enforcement interface. Guards the (le) interface. */
export async function requireLawEnforcement(): Promise<CurrentUser> {
  return requireInterface("le")
}

/** Requires access to the Prosecution interface. Guards the (prosecution) interface. */
export async function requireProsecution(): Promise<CurrentUser> {
  return requireInterface("prosecution")
}

/** Requires access to the Judge interface. Guards the (judge) interface. */
export async function requireJudge(): Promise<CurrentUser> {
  return requireInterface("judge")
}

/** Throws unless the current user has the given permission (server-side). */
export async function requirePermission(
  current: CurrentUser,
  permission: Permission,
): Promise<void> {
  if (!current.permissions.includes(permission)) {
    throw new Error("You do not have permission to perform this action")
  }
}

/**
 * Page guard: requires a staff member who holds a given permission.
 * Redirects civilians to the portal and unauthorized staff to the dashboard.
 */
export async function requireStaffPermission(
  permission: Permission,
): Promise<CurrentUser> {
  const current = await requireStaff()
  if (!current.permissions.includes(permission)) redirect("/dashboard")
  return current
}

/** Requires a signed-in user who can access the admin panel. */
export async function requireAdmin(): Promise<CurrentUser> {
  const current = await requireUser()
  if (!current.adminAccess) redirect("/dashboard")
  return current
}

/** Look up a user's display name + email by id (for labels). */
export async function getUserBasic(id: string) {
  const [row] = await db.select().from(user).where(eq(user.id, id)).limit(1)
  return row ?? null
}
