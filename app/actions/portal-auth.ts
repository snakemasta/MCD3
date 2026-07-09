"use server"

import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"
import { getSettings } from "@/lib/settings"

/**
 * Promotes the freshly-signed-up current user to the external `civilian` role.
 *
 * Safety: only applies when the account is a brand-new default profile
 * (role "viewer" with no active cases). This makes it safe to call right after
 * client self-registration without risking demotion of real staff accounts.
 */
export async function claimCivilianRole(): Promise<{ ok: boolean; error?: string }> {
  const current = await getCurrentUser()
  if (!current) return { ok: false, error: "Not signed in" }

  const civilian = await getSettings("civilian")
  if (!civilian.registrationEnabled) {
    return { ok: false, error: "Client registration is currently disabled" }
  }

  // Already a client — nothing to do.
  if (current.role === "civilian") return { ok: true }

  // Never convert an existing staff member or anyone with case activity.
  if (current.role !== "viewer" || current.activeCaseCount > 0) {
    return { ok: false, error: "This account cannot be used for the informant portal" }
  }

  await db
    .update(profile)
    .set({ role: "civilian" })
    .where(eq(profile.userId, current.id))

  return { ok: true }
}
