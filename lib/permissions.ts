import "server-only"
import { cache } from "react"
import { asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { roles as rolesTable } from "@/lib/db/schema"
import {
  ROLES,
  ROLE_PERMISSIONS,
  COUNSEL_ROLES,
  ALL_PERMISSIONS,
  type Permission,
  type Role,
} from "@/lib/constants"

export interface RoleConfig {
  key: string
  label: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  isCounsel: boolean
  adminAccess: boolean
  sortOrder: number
}

/** Built-in role definitions used to seed the DB and as a runtime fallback. */
export const DEFAULT_ROLE_CONFIGS: RoleConfig[] = ROLES.map((r, i) => ({
  key: r.value,
  label: r.label,
  description: r.description,
  permissions: ROLE_PERMISSIONS[r.value as Role] ?? [],
  isSystem: true,
  isCounsel: COUNSEL_ROLES.includes(r.value as Role),
  adminAccess: r.value === "admin",
  sortOrder: i,
}))

/**
 * Load all role configs from the database (per-request cached). Falls back to
 * the built-in defaults if the table is empty or unavailable.
 */
export const getRoleConfigs = cache(async (): Promise<RoleConfig[]> => {
  try {
    const rows = await db
      .select()
      .from(rolesTable)
      .orderBy(asc(rolesTable.sortOrder), asc(rolesTable.label))
    if (rows.length === 0) return DEFAULT_ROLE_CONFIGS
    return rows.map((r) => ({
      key: r.key,
      label: r.label,
      description: r.description,
      permissions: r.permissions ?? [],
      isSystem: r.isSystem,
      isCounsel: r.isCounsel,
      adminAccess: r.adminAccess,
      sortOrder: r.sortOrder,
    }))
  } catch {
    return DEFAULT_ROLE_CONFIGS
  }
})

/** Map of role key -> config for quick lookups. */
export async function getRoleMap(): Promise<Record<string, RoleConfig>> {
  const configs = await getRoleConfigs()
  return Object.fromEntries(configs.map((c) => [c.key, c]))
}

/** Resolve the effective permission list for a role key (DB-driven). */
export async function permissionsForRole(roleKey: string): Promise<string[]> {
  const map = await getRoleMap()
  const cfg = map[roleKey]
  if (cfg) return cfg.permissions
  // Unknown role: fall back to built-in defaults if present.
  return ROLE_PERMISSIONS[roleKey as Role] ?? []
}

/** Resolve the union of effective permissions across several role keys. */
export async function permissionsForRoles(roleKeys: string[]): Promise<string[]> {
  const map = await getRoleMap()
  const set = new Set<string>()
  for (const key of roleKeys) {
    const cfg = map[key]
    const perms = cfg ? cfg.permissions : (ROLE_PERMISSIONS[key as Role] ?? [])
    for (const p of perms) set.add(p)
  }
  return [...set]
}

/** Whether a role key can access the admin panel (DB-driven). */
export async function roleHasAdminAccess(roleKey: string): Promise<boolean> {
  const map = await getRoleMap()
  return map[roleKey]?.adminAccess ?? roleKey === "admin"
}

/** Whether any of the given role keys can access the admin panel. */
export async function rolesHaveAdminAccess(roleKeys: string[]): Promise<boolean> {
  const map = await getRoleMap()
  return roleKeys.some((k) => map[k]?.adminAccess ?? k === "admin")
}

export { ALL_PERMISSIONS }
export type { Permission }
