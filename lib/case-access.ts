import { db } from "@/lib/db"
import { caseAccess } from "@/lib/db/schema"
import { eq, and, or } from "drizzle-orm"
import type { CurrentUser } from "@/lib/session"

/**
 * Determine which "side" a user's role belongs to for case visibility.
 */
export function getUserSide(user: CurrentUser): "defense" | "prosecution" | "law_enforcement" | "admin" {
  if (user.role === "admin") return "admin"
  if (["state_attorney", "prosecutor"].includes(user.role)) return "prosecution"
  if (user.role === "law_enforcement") return "law_enforcement"
  return "defense" // default for all other staff roles
}

/**
 * Check if a user can view a case based on access controls and side.
 *
 * Default rules:
 * - Defense users can only view defense-side cases
 * - Prosecution users can only view prosecution-side cases
 * - LE users can view their own submitted reports
 * - Admin can view everything
 * - Side-specific can-view flag can override defaults
 */
export async function canUserViewCase(user: CurrentUser, caseId: string, caseSide?: string): Promise<boolean> {
  // Admins can view everything
  if (user.role === "admin") return true

  const userSide = getUserSide(user)

  // Check case_access table for explicit grants
  const access = await db
    .select()
    .from(caseAccess)
    .where(
      and(
        eq(caseAccess.caseId, caseId),
        or(
          eq(caseAccess.side, userSide),
          eq(caseAccess.userId, user.id),
        ),
      ),
    )
    .limit(1)

  if (access.length && access[0].canView) {
    return true
  }

  // Default: users can view cases on their own side
  if (caseSide && caseSide === userSide) {
    return true
  }

  return false
}

/**
 * Grant case access to a side or specific user.
 */
export async function grantCaseAccess(
  caseId: string,
  side: string,
  userId?: string,
  options?: {
    canView?: boolean
    canViewEvidence?: boolean
    canViewCharges?: boolean
    canMessage?: boolean
    canViewAi?: boolean
  },
) {
  await db.insert(caseAccess).values({
    caseId,
    side,
    userId,
    canView: options?.canView ?? true,
    canViewEvidence: options?.canViewEvidence ?? false,
    canViewCharges: options?.canViewCharges ?? false,
    canMessage: options?.canMessage ?? false,
    canViewAi: options?.canViewAi ?? false,
  })
}

/**
 * Generate default access controls when a prosecution case is created.
 * By default, prosecution side can view everything about their own cases.
 */
export async function initializeProsecutionCaseAccess(caseId: string) {
  // Prosecution users can view and manage their own cases
  await grantCaseAccess(caseId, "prosecution", undefined, {
    canView: true,
    canViewEvidence: true,
    canViewCharges: true,
    canMessage: true,
    canViewAi: true,
  })

  // Defense users have no default access (can be granted by admin/prosecution later)
  // LE users have no default access to prosecution cases
}

/**
 * Generate default access controls when a defense case is created or converted.
 * By default, defense side can view everything about their own cases.
 */
export async function initializeDefenseCaseAccess(caseId: string) {
  // Defense users can view and manage their own cases
  await grantCaseAccess(caseId, "defense", undefined, {
    canView: true,
    canViewEvidence: true,
    canViewCharges: true,
    canMessage: true,
    canViewAi: true,
  })

  // Prosecution/LE users have no default access to defense cases
}
