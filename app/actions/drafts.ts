"use server"

import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { drafts } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"

export async function listDrafts(caseId: string) {
  await requireUser()
  return db
    .select()
    .from(drafts)
    .where(eq(drafts.caseId, caseId))
    .orderBy(desc(drafts.updatedAt))
}

export async function createDraft(input: {
  caseId: string
  title: string
  type: string
  content: string
}) {
  const current = await requireUser()
  if (!current.permissions.includes("draft:manage")) {
    throw new Error("You do not have permission to manage drafts")
  }
  const [created] = await db
    .insert(drafts)
    .values({
      caseId: input.caseId,
      title: input.title,
      type: input.type,
      content: input.content,
      createdById: current.id,
    })
    .returning()
  revalidatePath(`/cases/${input.caseId}`)
  return created.id
}

export async function updateDraft(
  id: string,
  caseId: string,
  input: Partial<{ title: string; type: string; content: string }>,
) {
  const current = await requireUser()
  if (!current.permissions.includes("draft:manage")) {
    throw new Error("You do not have permission to manage drafts")
  }
  await db
    .update(drafts)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(drafts.id, id))
  revalidatePath(`/cases/${caseId}`)
}

export async function deleteDraft(id: string, caseId: string) {
  const current = await requireUser()
  if (!current.permissions.includes("draft:manage")) {
    throw new Error("You do not have permission to manage drafts")
  }
  await db.delete(drafts).where(eq(drafts.id, id))
  revalidatePath(`/cases/${caseId}`)
}
