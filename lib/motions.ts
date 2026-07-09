import "server-only"
import { and, desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { motions, motionHistory, motionAiReviews, cases } from "@/lib/db/schema"
import { motionStatusLabel, motionTypeLabel, motionSideLabel, type EvidenceLink } from "@/lib/motion-utils"

export type MotionRow = typeof motions.$inferSelect
export type MotionHistoryRow = typeof motionHistory.$inferSelect
export type MotionAiReviewRow = typeof motionAiReviews.$inferSelect

export interface MotionFilters {
  status?: string
  motionType?: string
  filingSide?: string
  caseId?: string
  filedById?: string
  judgeId?: string
  /** Free text search on title/number. */
  q?: string
}

/** Generate a unique-ish motion number. */
export function generateMotionNumber(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `MO-${year}-${Date.now().toString().slice(-5)}${rand.toString().slice(-1)}`
}

/** List motions with optional filtering. */
export async function listMotions(filters: MotionFilters = {}): Promise<MotionRow[]> {
  const conds = []
  if (filters.status) conds.push(eq(motions.status, filters.status))
  if (filters.motionType) conds.push(eq(motions.motionType, filters.motionType))
  if (filters.filingSide) conds.push(eq(motions.filingSide, filters.filingSide))
  if (filters.caseId) conds.push(eq(motions.caseId, filters.caseId))
  if (filters.filedById) conds.push(eq(motions.filedById, filters.filedById))
  if (filters.judgeId) conds.push(eq(motions.judgeId, filters.judgeId))
  if (filters.q) {
    const like = `%${filters.q.toLowerCase()}%`
    conds.push(
      sql`(lower(${motions.title}) like ${like} or lower(${motions.motionNumber}) like ${like})`,
    )
  }
  const where = conds.length ? and(...conds) : undefined
  return db.select().from(motions).where(where).orderBy(desc(motions.createdAt))
}

/** Queue of motions awaiting judicial action. */
export async function listJudgeMotionQueue(): Promise<MotionRow[]> {
  return db
    .select()
    .from(motions)
    .where(sql`${motions.status} in ('submitted', 'under_review', 'needs_more_info')`)
    .orderBy(desc(motions.createdAt))
}

export async function getMotion(id: string): Promise<MotionRow | null> {
  const [row] = await db.select().from(motions).where(eq(motions.id, id)).limit(1)
  return row ?? null
}

export async function getMotionHistory(motionId: string): Promise<MotionHistoryRow[]> {
  return db
    .select()
    .from(motionHistory)
    .where(eq(motionHistory.motionId, motionId))
    .orderBy(desc(motionHistory.createdAt))
}

/** Latest stored AI review for a motion, optionally filtered by audience. */
export async function getLatestMotionAiReview(
  motionId: string,
  audience?: string,
): Promise<MotionAiReviewRow | null> {
  const conds = [eq(motionAiReviews.motionId, motionId)]
  if (audience) conds.push(eq(motionAiReviews.audience, audience))
  const [row] = await db
    .select()
    .from(motionAiReviews)
    .where(and(...conds))
    .orderBy(desc(motionAiReviews.createdAt))
    .limit(1)
  return row ?? null
}

/** Build a plain-text context string describing a motion for the AI. */
export async function buildMotionContext(m: MotionRow): Promise<string> {
  const links = (Array.isArray(m.evidenceLinks) ? m.evidenceLinks : []) as EvidenceLink[]
  let caseText = ""
  const [c] = await db.select().from(cases).where(eq(cases.id, m.caseId)).limit(1)
  if (c) {
    caseText = `\nCASE #${c.caseNumber}: ${c.title}\nSide: ${c.side}\nCharges: ${c.charges ?? "—"}\nStatus: ${c.status}`
  }
  return [
    `MOTION #${m.motionNumber}: ${m.title}`,
    `Type: ${motionTypeLabel(m.motionType)}`,
    `Filed by: ${motionSideLabel(m.filingSide)} (${m.filedByName ?? "—"})`,
    `Status: ${motionStatusLabel(m.status)}`,
    `Urgency: ${m.urgency ?? "normal"}`,
    `Hearing requested: ${m.hearingRequested ? "yes" : "no"}`,
    `Relief requested:\n${m.relief ?? "—"}`,
    `Legal argument:\n${m.argument ?? "—"}`,
    `Factual basis:\n${m.factualBasis ?? "—"}`,
    `Authorities cited:\n${m.authoritiesCited ?? "—"}`,
    `Supporting exhibits: ${links.length ? links.map((l) => `${l.label} (${l.url})`).join("; ") : "none"}`,
    m.opposingResponse ? `Opposing party response:\n${m.opposingResponse}` : "",
    m.infoRequest ? `Outstanding question from the court:\n${m.infoRequest}` : "",
    m.infoResponse ? `Movant response to the court:\n${m.infoResponse}` : "",
    m.ruling ? `Court ruling:\n${m.ruling}` : "",
    caseText,
  ]
    .filter(Boolean)
    .join("\n")
}
