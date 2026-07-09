"use server"

import { asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { timelineEvents } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"

export async function listTimeline(caseId: string) {
  await requireUser()
  return db
    .select()
    .from(timelineEvents)
    .where(eq(timelineEvents.caseId, caseId))
    .orderBy(asc(timelineEvents.date))
}

export async function addTimelineEvent(input: {
  caseId: string
  date: Date
  title: string
  eventType: string
  description?: string
  deadlineStatus?: string
}) {
  const current = await requireUser()
  if (!current.permissions.includes("timeline:manage")) {
    throw new Error("You do not have permission to manage the timeline")
  }
  await db.insert(timelineEvents).values({
    caseId: input.caseId,
    date: input.date,
    title: input.title,
    eventType: input.eventType,
    description: input.description ?? null,
    deadlineStatus: input.deadlineStatus ?? "pending",
    responsibleUserId: current.id,
  })
  revalidatePath(`/cases/${input.caseId}`)
}

export async function updateTimelineEvent(
  id: string,
  caseId: string,
  input: Partial<{
    date: Date
    title: string
    eventType: string
    description: string | null
    deadlineStatus: string
  }>,
) {
  const current = await requireUser()
  if (!current.permissions.includes("timeline:manage")) {
    throw new Error("You do not have permission to manage the timeline")
  }
  await db.update(timelineEvents).set(input).where(eq(timelineEvents.id, id))
  revalidatePath(`/cases/${caseId}`)
}

export async function deleteTimelineEvent(id: string, caseId: string) {
  const current = await requireUser()
  if (!current.permissions.includes("timeline:manage")) {
    throw new Error("You do not have permission to manage the timeline")
  }
  await db.delete(timelineEvents).where(eq(timelineEvents.id, id))
  revalidatePath(`/cases/${caseId}`)
}

/** Bulk-insert AI-generated timeline events. */
export async function addTimelineEvents(
  caseId: string,
  events: {
    date: Date
    title: string
    eventType: string
    description?: string
  }[],
) {
  const current = await requireUser()
  if (!current.permissions.includes("timeline:manage")) {
    throw new Error("You do not have permission to manage the timeline")
  }
  if (events.length === 0) return
  await db.insert(timelineEvents).values(
    events.map((e) => ({
      caseId,
      date: e.date,
      title: e.title,
      eventType: e.eventType,
      description: e.description ?? null,
      responsibleUserId: current.id,
    })),
  )
  revalidatePath(`/cases/${caseId}`)
}
