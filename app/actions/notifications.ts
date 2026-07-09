"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/session"
import {
  getNotificationsForUser,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications"

export async function fetchMyNotifications() {
  const current = await getCurrentUser()
  if (!current) return { items: [], unread: 0 }
  const [items, unread] = await Promise.all([
    getNotificationsForUser(current.id),
    getUnreadCount(current.id),
  ])
  return { items, unread }
}

export async function markRead(id: string) {
  const current = await getCurrentUser()
  if (!current) throw new Error("Unauthorized")
  await markNotificationRead(current.id, id)
  revalidatePath("/", "layout")
}

export async function markAllRead() {
  const current = await getCurrentUser()
  if (!current) throw new Error("Unauthorized")
  await markAllNotificationsRead(current.id)
  revalidatePath("/", "layout")
}
