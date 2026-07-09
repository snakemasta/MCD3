import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { notificationPreferences } from "@/lib/db/schema"
import { getSettings } from "@/lib/settings"
import { DEFAULT_SOUND_TYPE, type NotificationSoundType } from "@/lib/notification-categories"

export interface NotificationPreferences {
  soundEnabled: boolean
  toastEnabled: boolean
  volume: number
  soundType: NotificationSoundType
  quietHoursEnabled: boolean
  quietStart: string
  quietEnd: string
  /** Explicit per-category overrides. A category missing here is enabled. */
  categories: Record<string, boolean>
}

/**
 * Preferences as resolved for the client: the user's own settings plus the
 * platform-level gates (global master switch + per-role gate) so the client
 * can make a single decision without extra round-trips.
 */
export interface ResolvedNotificationPreferences extends NotificationPreferences {
  /** Global master switch (admin). */
  globalSoundsEnabled: boolean
  /** Whether the user's role is permitted to hear sounds (admin role gate). */
  roleSoundAllowed: boolean
}

function baseDefaults(soundType: NotificationSoundType, volume: number): NotificationPreferences {
  return {
    soundEnabled: true,
    toastEnabled: true,
    volume,
    soundType,
    quietHoursEnabled: false,
    quietStart: "22:00",
    quietEnd: "07:00",
    categories: {},
  }
}

/** Read one user's preferences, merged over admin-configured defaults. */
export async function getNotificationPreferences(
  userId: string,
  role: string,
): Promise<ResolvedNotificationPreferences> {
  const settings = await getSettings("notification")
  const defaultSoundType = (settings.defaultSoundType as NotificationSoundType) || DEFAULT_SOUND_TYPE
  const defaults = baseDefaults(defaultSoundType, settings.defaultVolume ?? 70)

  let stored: Partial<NotificationPreferences> = {}
  try {
    const [row] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1)
    if (row) {
      stored = {
        soundEnabled: row.soundEnabled,
        toastEnabled: row.toastEnabled,
        volume: row.volume,
        soundType: row.soundType as NotificationSoundType,
        quietHoursEnabled: row.quietHoursEnabled,
        quietStart: row.quietStart,
        quietEnd: row.quietEnd,
        categories: (row.categories as Record<string, boolean>) ?? {},
      }
    }
  } catch {
    stored = {}
  }

  const roleSoundAllowed = settings.roleSoundEnabled?.[role] !== false

  return {
    ...defaults,
    ...stored,
    categories: { ...stored.categories },
    globalSoundsEnabled: settings.soundsEnabled !== false,
    roleSoundAllowed,
  }
}

/** Upsert a user's preferences. Only known fields are persisted. */
export async function saveNotificationPreferences(
  userId: string,
  input: Partial<NotificationPreferences>,
): Promise<void> {
  const clampVolume = (v: number) => Math.max(0, Math.min(100, Math.round(v)))
  const values = {
    userId,
    ...(input.soundEnabled !== undefined ? { soundEnabled: input.soundEnabled } : {}),
    ...(input.toastEnabled !== undefined ? { toastEnabled: input.toastEnabled } : {}),
    ...(input.volume !== undefined ? { volume: clampVolume(input.volume) } : {}),
    ...(input.soundType !== undefined ? { soundType: input.soundType } : {}),
    ...(input.quietHoursEnabled !== undefined ? { quietHoursEnabled: input.quietHoursEnabled } : {}),
    ...(input.quietStart !== undefined ? { quietStart: input.quietStart } : {}),
    ...(input.quietEnd !== undefined ? { quietEnd: input.quietEnd } : {}),
    ...(input.categories !== undefined ? { categories: input.categories } : {}),
    updatedAt: new Date(),
  }

  await db
    .insert(notificationPreferences)
    .values(values)
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: values,
    })
}
