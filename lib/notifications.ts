import "server-only"
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { notifications, userRoles, profile } from "@/lib/db/schema"
import { deriveCategory, type NotificationCategory } from "@/lib/notification-categories"

export type NotificationRow = typeof notifications.$inferSelect

interface CreateNotificationInput {
  /** Target a specific user. */
  userId?: string
  /** Or broadcast to everyone holding this role. */
  role?: string
  type?: string
  /** Fine-grained category for per-category sound preferences. Derived if omitted. */
  category?: NotificationCategory
  title: string
  body?: string
  link?: string
  warrantId?: string
  caseId?: string
  motionId?: string
}

/** Insert a single notification (user- or role-targeted). */
export async function createNotification(input: CreateNotificationInput) {
  await db.insert(notifications).values({
    userId: input.userId ?? null,
    role: input.role ?? null,
    type: input.type ?? "info",
    category: input.category ?? deriveCategory(input.type, input.title),
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    warrantId: input.warrantId ?? null,
    caseId: input.caseId ?? null,
    motionId: input.motionId ?? null,
  })
}

/** Broadcast a notification to every user holding any of the given roles. */
export async function notifyRoles(roles: string[], input: Omit<CreateNotificationInput, "userId" | "role">) {
  for (const role of roles) {
    await createNotification({ ...input, role })
  }
}

/** All role keys a user holds (primary + join table). */
async function rolesForUser(userId: string): Promise<string[]> {
  const [p] = await db.select({ role: profile.role }).from(profile).where(eq(profile.userId, userId)).limit(1)
  const rows = await db.select({ roleKey: userRoles.roleKey }).from(userRoles).where(eq(userRoles.userId, userId))
  const set = new Set<string>(rows.map((r) => r.roleKey))
  if (p?.role) set.add(p.role)
  return [...set]
}

/** Notifications visible to a user: directly addressed OR to a role they hold. */
export async function getNotificationsForUser(userId: string, limit = 30): Promise<NotificationRow[]> {
  const roles = await rolesForUser(userId)
  const roleClause = roles.length > 0 ? inArray(notifications.role, roles) : sql`false`
  return db
    .select()
    .from(notifications)
    .where(or(eq(notifications.userId, userId), roleClause))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
}

/** Count of unread notifications for a user. */
export async function getUnreadCount(userId: string): Promise<number> {
  const roles = await rolesForUser(userId)
  const roleClause = roles.length > 0 ? inArray(notifications.role, roles) : sql`false`
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(or(eq(notifications.userId, userId), roleClause), isNull(notifications.readAt)))
  return row?.count ?? 0
}

/** Mark a single notification read (only if it belongs to this user/their roles). */
export async function markNotificationRead(userId: string, id: string) {
  const roles = await rolesForUser(userId)
  const roleClause = roles.length > 0 ? inArray(notifications.role, roles) : sql`false`
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), or(eq(notifications.userId, userId), roleClause)))
}

/** Mark all of a user's notifications read. */
export async function markAllNotificationsRead(userId: string) {
  const roles = await rolesForUser(userId)
  const roleClause = roles.length > 0 ? inArray(notifications.role, roles) : sql`false`
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(or(eq(notifications.userId, userId), roleClause), isNull(notifications.readAt)))
}
