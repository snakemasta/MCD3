"use server"

import { revalidatePath } from "next/cache"
import { and, eq, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { recordLinks } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"
import { hrefForRecord, searchLinkableRecords, type RecordType } from "@/lib/record-links"

async function requireUser() {
  const current = await getCurrentUser()
  if (!current) throw new Error("Unauthorized")
  if (current.disabled) throw new Error("Account suspended")
  return current
}

/** Create a link between two records (deduped, undirected). */
export async function createRecordLink(input: {
  fromType: RecordType
  fromId: string
  toType: RecordType
  toId: string
  relation?: string
  note?: string
}) {
  const current = await requireUser()
  if (input.fromType === input.toType && input.fromId === input.toId) {
    throw new Error("Cannot link a record to itself")
  }

  // Avoid duplicates regardless of direction.
  const existing = await db
    .select({ id: recordLinks.id })
    .from(recordLinks)
    .where(
      or(
        and(
          eq(recordLinks.fromType, input.fromType),
          eq(recordLinks.fromId, input.fromId),
          eq(recordLinks.toType, input.toType),
          eq(recordLinks.toId, input.toId),
        ),
        and(
          eq(recordLinks.fromType, input.toType),
          eq(recordLinks.fromId, input.toId),
          eq(recordLinks.toType, input.fromType),
          eq(recordLinks.toId, input.fromId),
        ),
      ),
    )
    .limit(1)
  if (existing.length > 0) return { id: existing[0].id, duplicate: true }

  const [row] = await db
    .insert(recordLinks)
    .values({
      fromType: input.fromType,
      fromId: input.fromId,
      toType: input.toType,
      toId: input.toId,
      relation: input.relation || "related",
      note: input.note?.trim() || null,
      createdById: current.id,
    })
    .returning({ id: recordLinks.id })

  const a = hrefForRecord(input.fromType, input.fromId)
  const b = hrefForRecord(input.toType, input.toId)
  if (a) revalidatePath(a)
  if (b) revalidatePath(b)
  return { id: row.id }
}

/** Remove a link. */
export async function deleteRecordLink(id: string) {
  await requireUser()
  await db.delete(recordLinks).where(eq(recordLinks.id, id))
}

/** Search for records to link to (server action for the picker). */
export async function searchRecordsToLink(query: string) {
  await requireUser()
  if (!query.trim()) return []
  return searchLinkableRecords(query.trim())
}
