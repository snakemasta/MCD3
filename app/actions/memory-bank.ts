"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { lawLibrary } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { logAudit } from "@/lib/audit"

async function requireMemoryManager() {
  const current = await requireUser()
  if (!current.permissions.includes("memory:manage")) {
    throw new Error("You do not have permission to manage the Memory Bank")
  }
  return current
}

export interface MemoryEntryRow {
  id: string
  title: string
  category: string
  jurisdiction: string | null
  summary: string | null
  fullText: string
  tags: string[] | null
  status: string
  source: string
  aiEnabled: boolean
  createdByRole: string | null
  approvedById: string | null
  lastReviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/** List Memory Bank entries (entryKind = memory_bank), newest first. */
export async function listMemoryEntries(filter?: {
  status?: string
  search?: string
}): Promise<MemoryEntryRow[]> {
  await requireMemoryManager()
  const conds = [eq(lawLibrary.entryKind, "memory_bank")]
  if (filter?.status) conds.push(eq(lawLibrary.status, filter.status))

  const rows = await db
    .select({
      id: lawLibrary.id,
      title: lawLibrary.title,
      category: lawLibrary.category,
      jurisdiction: lawLibrary.jurisdiction,
      summary: lawLibrary.summary,
      fullText: lawLibrary.fullText,
      tags: lawLibrary.tags,
      status: lawLibrary.status,
      source: lawLibrary.source,
      aiEnabled: lawLibrary.aiEnabled,
      createdByRole: lawLibrary.createdByRole,
      approvedById: lawLibrary.approvedById,
      lastReviewedAt: lawLibrary.lastReviewedAt,
      createdAt: lawLibrary.createdAt,
      updatedAt: lawLibrary.updatedAt,
    })
    .from(lawLibrary)
    .where(and(...conds))
    .orderBy(desc(lawLibrary.updatedAt))

  let result = rows
  if (filter?.search) {
    const q = filter.search.toLowerCase()
    result = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.summary ?? "").toLowerCase().includes(q) ||
        (r.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    )
  }
  return result
}

export async function getMemoryEntry(id: string): Promise<MemoryEntryRow | null> {
  await requireMemoryManager()
  const [row] = await db
    .select()
    .from(lawLibrary)
    .where(and(eq(lawLibrary.id, id), eq(lawLibrary.entryKind, "memory_bank")))
    .limit(1)
  return (row as MemoryEntryRow) ?? null
}

export async function createMemoryEntry(input: {
  title: string
  category: string
  summary?: string
  fullText: string
  tags?: string[]
  source?: string
  aiEnabled?: boolean
}) {
  const current = await requireMemoryManager()
  const [row] = await db
    .insert(lawLibrary)
    .values({
      title: input.title.slice(0, 300),
      category: input.category,
      jurisdiction: "OTHER",
      summary: input.summary?.slice(0, 1000) ?? null,
      fullText: input.fullText,
      tags: input.tags ?? [],
      relatedCharges: [],
      status: "active",
      entryKind: "memory_bank",
      source: input.source ?? "manual",
      aiEnabled: input.aiEnabled ?? true,
      createdByRole: current.role,
      createdById: current.id,
      approvedById: current.id,
      lastReviewedAt: new Date(),
    })
    .returning({ id: lawLibrary.id })

  await logAudit({
    actorId: current.id,
    actorName: current.name,
    action: "memory.create",
    category: "system",
    targetType: "memory_bank",
    targetId: row.id,
    summary: `Created Memory Bank entry: ${input.title}`,
  })
  revalidatePath("/admin/memory-bank")
  return { id: row.id }
}

export async function updateMemoryEntry(
  id: string,
  input: {
    title: string
    category: string
    summary?: string
    fullText: string
    tags?: string[]
  },
) {
  const current = await requireMemoryManager()
  await db
    .update(lawLibrary)
    .set({
      title: input.title.slice(0, 300),
      category: input.category,
      summary: input.summary?.slice(0, 1000) ?? null,
      fullText: input.fullText,
      tags: input.tags ?? [],
      lastReviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(lawLibrary.id, id), eq(lawLibrary.entryKind, "memory_bank")))

  await logAudit({
    actorId: current.id,
    actorName: current.name,
    action: "memory.update",
    category: "system",
    targetType: "memory_bank",
    targetId: id,
    summary: `Updated Memory Bank entry: ${input.title}`,
  })
  revalidatePath("/admin/memory-bank")
}

/** Toggle whether an entry is retrievable as AI context. */
export async function setMemoryAiEnabled(id: string, aiEnabled: boolean) {
  const current = await requireMemoryManager()
  await db
    .update(lawLibrary)
    .set({ aiEnabled, updatedAt: new Date() })
    .where(and(eq(lawLibrary.id, id), eq(lawLibrary.entryKind, "memory_bank")))

  await logAudit({
    actorId: current.id,
    actorName: current.name,
    action: "memory.ai_toggle",
    category: "system",
    targetType: "memory_bank",
    targetId: id,
    summary: `${aiEnabled ? "Enabled" : "Disabled"} AI retrieval for a Memory Bank entry`,
  })
  revalidatePath("/admin/memory-bank")
}

/** Archive (soft-remove) or restore a Memory Bank entry. */
export async function setMemoryStatus(id: string, status: "active" | "archived") {
  const current = await requireMemoryManager()
  await db
    .update(lawLibrary)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(lawLibrary.id, id), eq(lawLibrary.entryKind, "memory_bank")))

  await logAudit({
    actorId: current.id,
    actorName: current.name,
    action: "memory.status",
    category: "system",
    targetType: "memory_bank",
    targetId: id,
    summary: `Set Memory Bank entry status to ${status}`,
  })
  revalidatePath("/admin/memory-bank")
}
