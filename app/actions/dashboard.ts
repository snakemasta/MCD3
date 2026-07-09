"use server"

import { asc, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { cases, filingDeadlines } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"

export async function getDashboardStats() {
  const current = await requireUser()

  const all = await db.select().from(cases)
  const open = all.filter((c) => c.status !== "closed")
  const mine = all.filter(
    (c) =>
      c.assignedAttorneyId === current.id ||
      c.assignedParalegalId === current.id,
  )
  const urgent = open.filter(
    (c) => c.priority === "urgent" || c.priority === "high",
  )
  const conflicts = open.filter((c) => c.conflictFlag)

  const byStatus: Record<string, number> = {}
  for (const c of all) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1

  // Upcoming deadlines (next, soonest first).
  const deadlineRows = await db
    .select({
      id: filingDeadlines.id,
      caseId: filingDeadlines.caseId,
      label: filingDeadlines.label,
      dueDate: filingDeadlines.dueDate,
      completed: filingDeadlines.completed,
      caseTitle: cases.title,
      caseNumber: cases.caseNumber,
    })
    .from(filingDeadlines)
    .innerJoin(cases, eq(cases.id, filingDeadlines.caseId))
    .where(eq(filingDeadlines.completed, false))
    .orderBy(asc(filingDeadlines.dueDate))
    .limit(8)

  // Recent cases.
  const recent = await db
    .select()
    .from(cases)
    .orderBy(desc(cases.updatedAt))
    .limit(6)

  return {
    totalCases: all.length,
    openCases: open.length,
    myCases: mine.length,
    urgentCases: urgent.length,
    conflictCases: conflicts.length,
    closedCases: all.length - open.length,
    byStatus,
    upcomingDeadlines: deadlineRows,
    recentCases: recent,
  }
}
