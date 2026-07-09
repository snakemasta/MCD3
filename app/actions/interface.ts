"use server"

import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { APP_INTERFACE_IDS, type AppInterface } from "@/lib/constants"

/**
 * Persist the interface a user last switched to, so their context is restored
 * on next sign-in / root navigation. Silently no-ops if the user does not have
 * access to the requested interface.
 */
export async function setActiveInterface(target: AppInterface) {
  const current = await requireUser()
  if (!APP_INTERFACE_IDS.includes(target)) return
  if (!current.interfaces.includes(target)) return
  await db
    .update(profile)
    .set({ lastInterface: target })
    .where(eq(profile.userId, current.id))
}
