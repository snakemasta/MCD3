import "server-only"
import { and, desc, eq, inArray, or, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { recordLinks, warrants, motions, cases, leReports, evidence, lawLibrary } from "@/lib/db/schema"

export type RecordType = "warrant" | "motion" | "case" | "report" | "evidence" | "knowledge"

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  warrant: "Warrant",
  motion: "Motion",
  case: "Case",
  report: "Police Report",
  evidence: "Evidence",
  knowledge: "Knowledge Entry",
}

export const RELATION_OPTIONS = [
  { value: "related", label: "Related to" },
  { value: "derived_from", label: "Derived from" },
  { value: "supersedes", label: "Supersedes" },
  { value: "supports", label: "Supports" },
] as const

export interface ResolvedLink {
  id: string
  relation: string
  note: string | null
  /** The record on the other end of the link, relative to the queried record. */
  type: RecordType
  recordId: string
  label: string
  href: string | null
  createdAt: Date
}

/** Internal app href for a record of the given type (defense/app surface). */
export function hrefForRecord(type: RecordType, id: string): string | null {
  switch (type) {
    case "warrant":
      return `/warrants/${id}`
    case "motion":
      return `/motions/${id}`
    case "case":
      return `/cases/${id}`
    case "report":
      return `/reports/${id}`
    case "knowledge":
      return `/law-library/${id}`
    default:
      return null
  }
}

/** Resolve human-readable labels for a batch of records of one type. */
async function labelsForType(type: RecordType, ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (ids.length === 0) return out
  const uniq = [...new Set(ids)]
  if (type === "warrant") {
    const rows = await db.select({ id: warrants.id, n: warrants.warrantNumber, t: warrants.title }).from(warrants).where(inArray(warrants.id, uniq))
    for (const r of rows) out.set(r.id, `${r.n} — ${r.t}`)
  } else if (type === "motion") {
    const rows = await db.select({ id: motions.id, n: motions.motionNumber, t: motions.title }).from(motions).where(inArray(motions.id, uniq))
    for (const r of rows) out.set(r.id, `${r.n} — ${r.t}`)
  } else if (type === "case") {
    const rows = await db.select({ id: cases.id, n: cases.caseNumber, t: cases.title }).from(cases).where(inArray(cases.id, uniq))
    for (const r of rows) out.set(r.id, `${r.n} — ${r.t}`)
  } else if (type === "report") {
    const rows = await db.select({ id: leReports.id, n: leReports.reportNumber, t: leReports.title }).from(leReports).where(inArray(leReports.id, uniq))
    for (const r of rows) out.set(r.id, `${r.n} — ${r.t}`)
  } else if (type === "evidence") {
    const rows = await db.select({ id: evidence.id, t: evidence.title }).from(evidence).where(inArray(evidence.id, uniq))
    for (const r of rows) out.set(r.id, r.t)
  } else if (type === "knowledge") {
    const rows = await db.select({ id: lawLibrary.id, t: lawLibrary.title }).from(lawLibrary).where(inArray(lawLibrary.id, uniq))
    for (const r of rows) out.set(r.id, r.t)
  }
  return out
}

/** All links touching a record, normalized so the "other side" is returned. */
export async function getLinksForRecord(type: RecordType, id: string): Promise<ResolvedLink[]> {
  const rows = await db
    .select()
    .from(recordLinks)
    .where(
      or(
        and(eq(recordLinks.fromType, type), eq(recordLinks.fromId, id)),
        and(eq(recordLinks.toType, type), eq(recordLinks.toId, id)),
      ),
    )
    .orderBy(desc(recordLinks.createdAt))

  // Determine the "other" record for each link.
  const others = rows.map((r) => {
    const isFrom = r.fromType === type && r.fromId === id
    return {
      linkId: r.id,
      relation: r.relation,
      note: r.note,
      createdAt: r.createdAt,
      type: (isFrom ? r.toType : r.fromType) as RecordType,
      recordId: isFrom ? r.toId : r.fromId,
    }
  })

  // Resolve labels grouped by type.
  const byType = new Map<RecordType, string[]>()
  for (const o of others) {
    byType.set(o.type, [...(byType.get(o.type) ?? []), o.recordId])
  }
  const labelMaps = new Map<RecordType, Map<string, string>>()
  for (const [t, ids] of byType.entries()) {
    labelMaps.set(t, await labelsForType(t, ids))
  }

  return others.map((o) => ({
    id: o.linkId,
    relation: o.relation,
    note: o.note,
    type: o.type,
    recordId: o.recordId,
    label: labelMaps.get(o.type)?.get(o.recordId) ?? `${RECORD_TYPE_LABELS[o.type]} ${o.recordId.slice(0, 8)}`,
    href: hrefForRecord(o.type, o.recordId),
    createdAt: o.createdAt,
  }))
}

/** Lightweight search across linkable record types, for the "add link" picker. */
export async function searchLinkableRecords(query: string, limit = 8): Promise<
  { type: RecordType; id: string; label: string }[]
> {
  const like = `%${query.toLowerCase()}%`
  const results: { type: RecordType; id: string; label: string }[] = []

  const [w, m, c, r] = await Promise.all([
    db.select({ id: warrants.id, n: warrants.warrantNumber, t: warrants.title }).from(warrants)
      .where(sql`lower(${warrants.title}) like ${like} or lower(${warrants.warrantNumber}) like ${like}`).limit(limit),
    db.select({ id: motions.id, n: motions.motionNumber, t: motions.title }).from(motions)
      .where(sql`lower(${motions.title}) like ${like} or lower(${motions.motionNumber}) like ${like}`).limit(limit),
    db.select({ id: cases.id, n: cases.caseNumber, t: cases.title }).from(cases)
      .where(sql`lower(${cases.title}) like ${like} or lower(${cases.caseNumber}) like ${like}`).limit(limit),
    db.select({ id: leReports.id, n: leReports.reportNumber, t: leReports.title }).from(leReports)
      .where(sql`lower(${leReports.title}) like ${like} or lower(${leReports.reportNumber}) like ${like}`).limit(limit),
  ])
  for (const x of w) results.push({ type: "warrant", id: x.id, label: `${x.n} — ${x.t}` })
  for (const x of m) results.push({ type: "motion", id: x.id, label: `${x.n} — ${x.t}` })
  for (const x of c) results.push({ type: "case", id: x.id, label: `${x.n} — ${x.t}` })
  for (const x of r) results.push({ type: "report", id: x.id, label: `${x.n} — ${x.t}` })
  return results.slice(0, limit * 2)
}
