import "server-only"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { profile as profileTable } from "@/lib/db/schema"
import {
  ALL_PERMISSIONS,
  APP_INTERFACES,
  APP_INTERFACE_IDS,
  INTERFACE_LABELS,
  PERMISSION_LABELS,
  interfacesForRoles,
  type AppInterface,
  type Permission,
} from "@/lib/constants"
import { getRoleConfigs, type RoleConfig } from "@/lib/permissions"

export type CheckStatus = "pass" | "warn" | "fail"

export interface AuditCheck {
  label: string
  status: CheckStatus
  detail: string
  recommendation?: string
}

export interface AuditCategory {
  id: string
  title: string
  description: string
  checks: AuditCheck[]
}

export interface AuditSummary {
  pass: number
  warn: number
  fail: number
  total: number
}

export interface PermissionAuditResult {
  ranAt: string
  summary: AuditSummary
  categories: AuditCategory[]
}

/**
 * Registry of protected surfaces. This is hand-maintained and verified against
 * the codebase so the health check can report which routes/actions enforce
 * access and how. Each entry records the guard the surface relies on.
 *
 * `enforced: false` means the surface has NO server-side access check and
 * should be flagged by the audit.
 */
interface ProtectedSurface {
  name: string
  kind: "page-group" | "api-route" | "action-module"
  guard: string
  enforced: boolean
  note?: string
}

export const PROTECTED_SURFACES: ProtectedSurface[] = [
  // Page route groups (layout-level guards)
  { name: "(app) Defense interface", kind: "page-group", guard: "requireStaff()", enforced: true },
  { name: "(app)/admin Admin Panel", kind: "page-group", guard: "requireAdmin()", enforced: true },
  { name: "(portal) Informant Portal", kind: "page-group", guard: "requireCivilian()", enforced: true },
  { name: "(le) Law Enforcement", kind: "page-group", guard: "requireLawEnforcement()", enforced: true },
  { name: "(prosecution) Prosecution", kind: "page-group", guard: "requireProsecution()", enforced: true },

  // API routes
  { name: "api/analyze", kind: "api-route", guard: "getCurrentUserSafe() → 401", enforced: true },
  { name: "api/chat", kind: "api-route", guard: "getCurrentUserSafe() → 401", enforced: true },
  { name: "api/case-analyze", kind: "api-route", guard: "getCurrentUser + case access", enforced: true },
  { name: "api/case-chat", kind: "api-route", guard: "getCurrentUser + case access", enforced: true },
  { name: "api/generate-draft", kind: "api-route", guard: "getCurrentUser + case access", enforced: true },
  { name: "api/generate-plan", kind: "api-route", guard: "getCurrentUser + case access", enforced: true },
  { name: "api/intake-review", kind: "api-route", guard: "requireStaff + permission", enforced: true },
  { name: "api/laws", kind: "api-route", guard: "requireStaff + law-library:view", enforced: true },
  { name: "api/laws/[id]", kind: "api-route", guard: "requireStaff + law-library:view", enforced: true },
  { name: "api/le-reports", kind: "api-route", guard: "requireLawEnforcement", enforced: true },
  { name: "api/le-reports/[id]", kind: "api-route", guard: "requireLawEnforcement + ownership", enforced: true },
  { name: "api/prosecution/review-queue", kind: "api-route", guard: "requireProsecution", enforced: true },
  { name: "api/prosecution/convert-case", kind: "api-route", guard: "requireProsecution + permission", enforced: true },
  { name: "api/auth/[...all]", kind: "api-route", guard: "Better Auth handler", enforced: true, note: "Auth provider endpoint." },

  // Server action modules
  { name: "actions/admin", kind: "action-module", guard: "requireAdmin()", enforced: true },
  { name: "actions/cases", kind: "action-module", guard: "requireStaff + case access", enforced: true },
  { name: "actions/evidence", kind: "action-module", guard: "requireStaff + case access", enforced: true },
  { name: "actions/timeline", kind: "action-module", guard: "requireStaff + case access", enforced: true },
  { name: "actions/plan", kind: "action-module", guard: "requireStaff + case access", enforced: true },
  { name: "actions/drafts", kind: "action-module", guard: "requireStaff + case access", enforced: true },
  { name: "actions/deadlines", kind: "action-module", guard: "requireStaff + case access", enforced: true },
  { name: "actions/case-chat", kind: "action-module", guard: "getCurrentUser + case access", enforced: true },
  { name: "actions/analysis", kind: "action-module", guard: "requireStaff", enforced: true },
  { name: "actions/dashboard", kind: "action-module", guard: "requireStaff", enforced: true },
  { name: "actions/intake", kind: "action-module", guard: "requireStaff / requireCivilian", enforced: true },
  { name: "actions/portal", kind: "action-module", guard: "requireCivilian + ownership", enforced: true },
  { name: "actions/portal-auth", kind: "action-module", guard: "Auth flow", enforced: true },
  { name: "actions/team", kind: "action-module", guard: "requireStaff", enforced: true },
  { name: "actions/interface", kind: "action-module", guard: "requireUser()", enforced: true },
  { name: "actions/police-reports", kind: "action-module", guard: "requireStaff + report:view-all / evidence:add-report", enforced: true },
]

function summarize(categories: AuditCategory[]): AuditSummary {
  let pass = 0
  let warn = 0
  let fail = 0
  for (const cat of categories) {
    for (const c of cat.checks) {
      if (c.status === "pass") pass++
      else if (c.status === "warn") warn++
      else fail++
    }
  }
  return { pass, warn, fail, total: pass + warn + fail }
}

/** Run the full permission audit against live role configs + the registry. */
export async function runPermissionAudit(): Promise<PermissionAuditResult> {
  const roles = await getRoleConfigs()
  const roleByKey = new Map(roles.map((r) => [r.key, r]))

  const categories: AuditCategory[] = []

  // 1. Admin integrity ------------------------------------------------------
  const adminChecks: AuditCheck[] = []
  const adminRole = roleByKey.get("admin")
  if (!adminRole) {
    adminChecks.push({
      label: "Admin role exists",
      status: "fail",
      detail: "No role with key \"admin\" was found.",
      recommendation: "Restore the built-in Admin role.",
    })
  } else {
    adminChecks.push({
      label: "Admin role exists",
      status: "pass",
      detail: `Found \"${adminRole.label}\".`,
    })
    adminChecks.push({
      label: "Admin can access the admin panel",
      status: adminRole.adminAccess ? "pass" : "fail",
      detail: adminRole.adminAccess
        ? "Admin role has admin-panel access."
        : "Admin role is missing admin-panel access.",
      recommendation: adminRole.adminAccess
        ? undefined
        : "Enable Admin access on the Admin role.",
    })
    const missing = ALL_PERMISSIONS.filter(
      (p) => !adminRole.permissions.includes(p),
    )
    adminChecks.push({
      label: "Admin holds every permission",
      status: missing.length === 0 ? "pass" : "fail",
      detail:
        missing.length === 0
          ? `All ${ALL_PERMISSIONS.length} permissions granted.`
          : `Missing ${missing.length}: ${missing
              .map((p) => PERMISSION_LABELS[p] ?? p)
              .join(", ")}.`,
      recommendation:
        missing.length === 0
          ? undefined
          : "Grant the Admin role all permissions for full access.",
    })
  }

  // At least one active admin user
  let activeAdmins = 0
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(profileTable)
      .where(
        sql`(${profileTable.role} = 'admin' OR ${profileTable.userId} IN (SELECT "userId" FROM user_roles WHERE "roleKey" = 'admin')) AND ${profileTable.disabled} = false`,
      )
    activeAdmins = row?.count ?? 0
  } catch {
    activeAdmins = -1
  }
  adminChecks.push({
    label: "At least one active admin user",
    status: activeAdmins > 0 ? "pass" : activeAdmins === 0 ? "fail" : "warn",
    detail:
      activeAdmins > 0
        ? `${activeAdmins} active admin user(s).`
        : activeAdmins === 0
          ? "No active users hold the admin role."
          : "Could not verify admin users.",
    recommendation:
      activeAdmins === 0 ? "Assign the admin role to at least one user." : undefined,
  })

  categories.push({
    id: "admin",
    title: "Admin Access",
    description: "Admin must be able to access and manage everything.",
    checks: adminChecks,
  })

  // 2. Role definitions -----------------------------------------------------
  const roleChecks: AuditCheck[] = []
  const validPerms = new Set<string>(ALL_PERMISSIONS)
  for (const role of roles) {
    const unknown = role.permissions.filter((p) => !validPerms.has(p))
    if (unknown.length > 0) {
      roleChecks.push({
        label: `${role.label}: unknown permissions`,
        status: "fail",
        detail: `Grants permissions not in the registry: ${unknown.join(", ")}.`,
        recommendation: "Remove stale permissions or add them to ALL_PERMISSIONS.",
      })
    }
    // Non-admin, non-viewer/civilian roles with zero permissions are suspect.
    const minimalOk = ["viewer", "civilian"].includes(role.key)
    if (role.permissions.length === 0 && !minimalOk && !role.adminAccess) {
      roleChecks.push({
        label: `${role.label}: no permissions`,
        status: "warn",
        detail: "This role grants no permissions, so members can do nothing.",
        recommendation: "Grant at least one permission or remove the role.",
      })
    }
  }
  if (roleChecks.length === 0) {
    roleChecks.push({
      label: "All role definitions valid",
      status: "pass",
      detail: `${roles.length} roles checked — no unknown or empty permission sets.`,
    })
  }

  // Unused permissions (granted to no role)
  const granted = new Set<string>()
  for (const r of roles) r.permissions.forEach((p) => granted.add(p))
  const unused = ALL_PERMISSIONS.filter((p) => !granted.has(p))
  roleChecks.push({
    label: "Permission coverage",
    status: unused.length === 0 ? "pass" : "warn",
    detail:
      unused.length === 0
        ? "Every permission is granted to at least one role."
        : `${unused.length} permission(s) granted to no role: ${unused
            .map((p) => PERMISSION_LABELS[p as Permission] ?? p)
            .join(", ")}.`,
    recommendation:
      unused.length === 0
        ? undefined
        : "Assign these permissions to a role or remove them if obsolete.",
  })

  categories.push({
    id: "roles",
    title: "Role Definitions",
    description: "Every role must reference only known permissions.",
    checks: roleChecks,
  })

  // 3. Interface access -----------------------------------------------------
  const interfaceChecks: AuditCheck[] = []
  for (const iface of APP_INTERFACES) {
    const grantingRoles = roles.filter(
      (r) =>
        r.adminAccess ||
        interfacesForRoles([r.key]).includes(iface.id),
    )
    const nonAdmin = grantingRoles.filter((r) => !r.adminAccess)
    interfaceChecks.push({
      label: `${iface.label} interface reachable`,
      status: nonAdmin.length > 0 ? "pass" : "warn",
      detail:
        nonAdmin.length > 0
          ? `Reachable by: ${nonAdmin.map((r) => r.label).join(", ")}.`
          : "Only admins can reach this interface.",
      recommendation:
        nonAdmin.length > 0
          ? undefined
          : "Confirm a non-admin role is meant to use this interface.",
    })
  }
  categories.push({
    id: "interfaces",
    title: "Interface Access",
    description: "Each work surface should be reachable by its intended roles.",
    checks: interfaceChecks,
  })

  // 4. Protected routes & actions -------------------------------------------
  const enforcementChecks: AuditCheck[] = []
  const groups: ProtectedSurface["kind"][] = [
    "page-group",
    "api-route",
    "action-module",
  ]
  const kindLabels: Record<ProtectedSurface["kind"], string> = {
    "page-group": "Page route groups",
    "api-route": "API routes",
    "action-module": "Server action modules",
  }
  for (const kind of groups) {
    const surfaces = PROTECTED_SURFACES.filter((s) => s.kind === kind)
    const unenforced = surfaces.filter((s) => !s.enforced)
    enforcementChecks.push({
      label: kindLabels[kind],
      status: unenforced.length === 0 ? "pass" : "fail",
      detail:
        unenforced.length === 0
          ? `${surfaces.length} surface(s) enforce server-side access checks.`
          : `${unenforced.length} surface(s) lack enforcement: ${unenforced
              .map((s) => s.name)
              .join(", ")}.`,
      recommendation:
        unenforced.length === 0
          ? undefined
          : "Add a server-side guard to each unenforced surface.",
    })
  }
  categories.push({
    id: "enforcement",
    title: "Server-Side Enforcement",
    description:
      "Protected routes and server actions must verify access on the server.",
    checks: enforcementChecks,
  })

  return {
    ranAt: new Date().toISOString(),
    summary: summarize(categories),
    categories,
  }
}

/** Build the role → permissions / interfaces matrix for display. */
export async function getPermissionMatrix(): Promise<{
  roles: (RoleConfig & { interfaces: AppInterface[] })[]
  permissions: { key: string; label: string }[]
  interfaces: { id: AppInterface; label: string }[]
}> {
  const roles = await getRoleConfigs()
  const withInterfaces = roles.map((r) => ({
    ...r,
    interfaces: r.adminAccess
      ? [...APP_INTERFACE_IDS]
      : interfacesForRoles([r.key]),
  }))
  return {
    roles: withInterfaces,
    permissions: ALL_PERMISSIONS.map((p) => ({
      key: p,
      label: PERMISSION_LABELS[p] ?? p,
    })),
    interfaces: APP_INTERFACE_IDS.map((id) => ({
      id,
      label: INTERFACE_LABELS[id],
    })),
  }
}
