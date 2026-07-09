import "server-only"
import { db } from "@/lib/db"
import { timelineEvents } from "@/lib/db/schema"

export interface CaseEventInput {
  caseId: string
  title: string
  /** Maps to timeline_events.eventType (e.g. "filing", "court", "arrest", "custom"). */
  eventType?: string
  date?: Date | string | null
  description?: string | null
  /** "complete" for things that already happened, "pending" for scheduled/future. */
  deadlineStatus?: "pending" | "complete" | "overdue"
  responsibleUserId?: string | null
}

/**
 * Append a single event to a case's master timeline. Returns the new event id.
 * Used across the app so warrants, motions, rulings, hearings, and case status
 * changes all flow into one chronological record per case.
 */
export async function addCaseEvent(input: CaseEventInput): Promise<string> {
  const [row] = await db
    .insert(timelineEvents)
    .values({
      caseId: input.caseId,
      date: input.date ? new Date(input.date) : new Date(),
      title: input.title,
      eventType: input.eventType ?? "custom",
      description: input.description ?? null,
      deadlineStatus: input.deadlineStatus ?? "complete",
      responsibleUserId: input.responsibleUserId ?? null,
    })
    .returning({ id: timelineEvents.id })
  return row.id
}

/** Convenience: log a motion-related event on the case timeline. */
export async function logMotionEvent(
  caseId: string,
  motionNumber: string,
  action: string,
  description?: string | null,
): Promise<string> {
  return addCaseEvent({
    caseId,
    title: `Motion ${motionNumber}: ${action}`,
    eventType: "filing",
    description: description ?? null,
    deadlineStatus: "complete",
  })
}

/** Convenience: schedule a hearing on the case timeline (future, pending). */
export async function scheduleHearingEvent(input: {
  caseId: string
  date: Date | string
  title: string
  description?: string | null
}): Promise<string> {
  return addCaseEvent({
    caseId: input.caseId,
    title: input.title,
    eventType: "court",
    date: input.date,
    description: input.description ?? null,
    deadlineStatus: "pending",
  })
}
