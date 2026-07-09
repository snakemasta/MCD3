/**
 * Shared notification taxonomy used by both server (when creating notifications)
 * and client (sound engine + per-category preference UI). No "server-only" here.
 */

export type NotificationCategory =
  | "intake_submitted"
  | "warrant_requested"
  | "warrant_approved"
  | "warrant_denied"
  | "motion_submitted"
  | "motion_approved"
  | "motion_denied"
  | "case_assigned"
  | "case_message"
  | "evidence_added"
  | "report_submitted"
  | "info_requested"
  | "deadline_alert"
  | "court_date_alert"
  | "general"

export interface NotificationCategoryDef {
  key: NotificationCategory
  label: string
  description: string
}

/** The canonical, ordered list of categories surfaced in preferences. */
export const NOTIFICATION_CATEGORIES: NotificationCategoryDef[] = [
  { key: "intake_submitted", label: "New client intake", description: "A new client intake request is submitted." },
  { key: "warrant_requested", label: "New warrant request", description: "A warrant request is submitted for review." },
  { key: "warrant_approved", label: "Warrant approved", description: "A warrant request is approved." },
  { key: "warrant_denied", label: "Warrant denied", description: "A warrant request is denied." },
  { key: "motion_submitted", label: "Motion submitted", description: "A motion is filed on a case." },
  { key: "motion_approved", label: "Motion granted", description: "A motion is granted by the court." },
  { key: "motion_denied", label: "Motion denied", description: "A motion is denied by the court." },
  { key: "case_assigned", label: "Case assigned", description: "A case is assigned to you." },
  { key: "case_message", label: "New case message", description: "A new message is posted on a case." },
  { key: "evidence_added", label: "New evidence", description: "New evidence is added to a case." },
  { key: "report_submitted", label: "Police report submitted", description: "A police report is submitted." },
  { key: "info_requested", label: "More information requested", description: "A judge requests additional information." },
  { key: "deadline_alert", label: "Deadline alerts", description: "An upcoming deadline is approaching." },
  { key: "court_date_alert", label: "Court date alerts", description: "An upcoming court date is approaching." },
  { key: "general", label: "General", description: "Other notifications." },
]

export const NOTIFICATION_CATEGORY_KEYS = NOTIFICATION_CATEGORIES.map((c) => c.key)

const CATEGORY_SET = new Set<string>(NOTIFICATION_CATEGORY_KEYS)

export function isNotificationCategory(value: unknown): value is NotificationCategory {
  return typeof value === "string" && CATEGORY_SET.has(value)
}

export function categoryLabel(key: string): string {
  return NOTIFICATION_CATEGORIES.find((c) => c.key === key)?.label ?? "Notification"
}

/**
 * Best-effort mapping for notifications that were created without an explicit
 * category (legacy rows or call sites that only set a coarse `type`). Uses the
 * coarse type plus keywords in the title to land on a specific category.
 */
export function deriveCategory(type: string | null | undefined, title: string | null | undefined): NotificationCategory {
  const t = (title ?? "").toLowerCase()

  if (type === "warrant") {
    if (t.includes("approv")) return "warrant_approved"
    if (t.includes("den") || t.includes("reject")) return "warrant_denied"
    if (t.includes("more info") || t.includes("information")) return "info_requested"
    return "warrant_requested"
  }
  if (type === "motion") {
    if (t.includes("grant") || t.includes("approv")) return "motion_approved"
    if (t.includes("den") || t.includes("reject")) return "motion_denied"
    if (t.includes("more info") || t.includes("information")) return "info_requested"
    return "motion_submitted"
  }
  if (type === "case") {
    if (t.includes("message")) return "case_message"
    if (t.includes("evidence")) return "evidence_added"
    if (t.includes("assign")) return "case_assigned"
    return "case_assigned"
  }
  if (type === "intake") return "intake_submitted"
  if (type === "report") return "report_submitted"
  if (type === "deadline") return "deadline_alert"
  if (type === "court_date") return "court_date_alert"

  // Fall back to title keywords for the coarse "info" type.
  if (t.includes("intake")) return "intake_submitted"
  if (t.includes("report")) return "report_submitted"
  if (t.includes("deadline")) return "deadline_alert"
  if (t.includes("court date") || t.includes("hearing")) return "court_date_alert"
  if (t.includes("message")) return "case_message"
  if (t.includes("evidence")) return "evidence_added"
  if (t.includes("assigned")) return "case_assigned"
  return "general"
}

// --- Sound types ------------------------------------------------------------

export type NotificationSoundType = "chime" | "ping" | "bell" | "alert" | "digital"

export interface SoundTypeDef {
  key: NotificationSoundType
  label: string
  description: string
}

export const NOTIFICATION_SOUND_TYPES: SoundTypeDef[] = [
  { key: "chime", label: "Chime", description: "Soft two-note chime (default)." },
  { key: "ping", label: "Ping", description: "Single subtle ping." },
  { key: "bell", label: "Bell", description: "Gentle bell tone." },
  { key: "alert", label: "Alert", description: "Rising two-tone alert." },
  { key: "digital", label: "Digital", description: "Short digital blip." },
]

/** Convenience map of sound-type key -> label, used by select inputs. */
export const SOUND_TYPE_LABELS: Record<NotificationSoundType, string> = NOTIFICATION_SOUND_TYPES.reduce(
  (acc, s) => {
    acc[s.key] = s.label
    return acc
  },
  {} as Record<NotificationSoundType, string>,
)

export const DEFAULT_SOUND_TYPE: NotificationSoundType = "chime"

/**
 * Whether the given Date (default: now) falls inside a quiet-hours window
 * expressed as "HH:MM" strings in local time. Handles windows that wrap past
 * midnight (e.g. 22:00 -> 07:00).
 */
export function isWithinQuietHours(start: string, end: string, now: Date = new Date()): boolean {
  const toMinutes = (hhmm: string): number | null => {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm)
    if (!m) return null
    return Number(m[1]) * 60 + Number(m[2])
  }
  const s = toMinutes(start)
  const e = toMinutes(end)
  if (s === null || e === null) return false
  const cur = now.getHours() * 60 + now.getMinutes()
  if (s === e) return false // zero-length window
  if (s < e) return cur >= s && cur < e // same-day window
  return cur >= s || cur < e // wraps past midnight
}
