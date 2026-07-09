import "server-only"
import { asc, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { cases, evidence, timelineEvents } from "@/lib/db/schema"
import { caseContextBlock } from "@/lib/prompts"

/** Loads a case + its evidence + timeline and returns a prompt-ready context block. */
export async function buildCaseContext(caseId: string): Promise<string | null> {
  const [c] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1)
  if (!c) return null

  const ev = await db
    .select()
    .from(evidence)
    .where(eq(evidence.caseId, caseId))
    .orderBy(desc(evidence.createdAt))

  const tl = await db
    .select()
    .from(timelineEvents)
    .where(eq(timelineEvents.caseId, caseId))
    .orderBy(asc(timelineEvents.date))

  return caseContextBlock({
    title: c.title,
    caseNumber: c.caseNumber,
    clientName: c.clientName,
    caseType: c.caseType,
    charges: c.charges,
    status: c.status,
    priority: c.priority,
    notes: c.notes,
    evidence: ev.map((e) => ({
      title: e.title,
      evidenceType: e.evidenceType,
      status: e.status,
      description: e.description,
    })),
    timeline: tl.map((t) => ({
      date: new Date(t.date).toISOString().slice(0, 10),
      title: t.title,
      eventType: t.eventType,
      description: t.description,
    })),
  })
}
