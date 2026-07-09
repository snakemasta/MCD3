"use server"

import { asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { casePlanItems } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"

export async function listPlanItems(caseId: string) {
  await requireUser()
  return db
    .select()
    .from(casePlanItems)
    .where(eq(casePlanItems.caseId, caseId))
    .orderBy(asc(casePlanItems.createdAt))
}

export async function addPlanItem(input: {
  caseId: string
  content: string
  category: string
  ownerId?: string | null
  dueDate?: Date | null
}) {
  const current = await requireUser()
  if (!current.permissions.includes("plan:manage")) {
    throw new Error("You do not have permission to manage the case plan")
  }
  await db.insert(casePlanItems).values({
    caseId: input.caseId,
    content: input.content,
    category: input.category,
    ownerId: input.ownerId ?? null,
    dueDate: input.dueDate ?? null,
  })
  revalidatePath(`/cases/${input.caseId}`)
}

export async function updatePlanItem(
  id: string,
  caseId: string,
  input: Partial<{
    content: string
    category: string
    status: string
    ownerId: string | null
    dueDate: Date | null
  }>,
) {
  const current = await requireUser()
  if (!current.permissions.includes("plan:manage")) {
    throw new Error("You do not have permission to manage the case plan")
  }
  await db.update(casePlanItems).set(input).where(eq(casePlanItems.id, id))
  revalidatePath(`/cases/${caseId}`)
}

export async function deletePlanItem(id: string, caseId: string) {
  const current = await requireUser()
  if (!current.permissions.includes("plan:manage")) {
    throw new Error("You do not have permission to manage the case plan")
  }
  await db.delete(casePlanItems).where(eq(casePlanItems.id, id))
  revalidatePath(`/cases/${caseId}`)
}

export async function addPlanItems(
  caseId: string,
  items: { content: string; category: string }[],
) {
  const current = await requireUser()
  if (!current.permissions.includes("plan:manage")) {
    throw new Error("You do not have permission to manage the case plan")
  }
  if (items.length === 0) return
  await db.insert(casePlanItems).values(
    items.map((i) => ({
      caseId,
      content: i.content,
      category: i.category,
    })),
  )
  revalidatePath(`/cases/${caseId}`)
}
