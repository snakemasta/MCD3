import { getCurrentUserSafe } from "@/lib/session"
import { getNotificationsForUser, getUnreadCount } from "@/lib/notifications"
import { deriveCategory } from "@/lib/notification-categories"

export async function GET() {
  const user = await getCurrentUserSafe()
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }
  const [rows, unread] = await Promise.all([
    getNotificationsForUser(user.id, 20),
    getUnreadCount(user.id),
  ])
  // Always resolve a category so the client can apply per-category sound rules,
  // even for legacy rows stored before the category column existed.
  const items = rows.map((n) => ({
    ...n,
    category: n.category ?? deriveCategory(n.type, n.title),
  }))
  return Response.json({ items, unread })
}
