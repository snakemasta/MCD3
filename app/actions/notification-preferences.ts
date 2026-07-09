"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/session"
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
  type ResolvedNotificationPreferences,
} from "@/lib/notification-preferences"
import { NOTIFICATION_SOUND_TYPES } from "@/lib/notification-categories"

export async function getMyNotificationPreferences(): Promise<ResolvedNotificationPreferences | null> {
  const current = await getCurrentUser()
  if (!current) return null
  return getNotificationPreferences(current.id, current.role)
}

export async function saveMyNotificationPreferences(
  input: Partial<NotificationPreferences>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const current = await getCurrentUser()
  if (!current) return { ok: false, error: "Unauthorized" }

  // Validate sound type against the known list.
  if (input.soundType !== undefined) {
    const valid = NOTIFICATION_SOUND_TYPES.some((s) => s.key === input.soundType)
    if (!valid) return { ok: false, error: "Invalid sound type" }
  }
  // Validate quiet-hours format (HH:MM) when provided.
  const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/
  if (input.quietStart !== undefined && !timeRe.test(input.quietStart)) {
    return { ok: false, error: "Invalid quiet hours start time" }
  }
  if (input.quietEnd !== undefined && !timeRe.test(input.quietEnd)) {
    return { ok: false, error: "Invalid quiet hours end time" }
  }

  await saveNotificationPreferences(current.id, input)
  revalidatePath("/", "layout")
  return { ok: true }
}
