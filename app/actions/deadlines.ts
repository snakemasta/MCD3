"use server"

import { asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { filingDeadlines } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"

export async function listDeadlines(caseId: string) {
  await requireUser()
  return db
    .select()
    .from(filingDeadlines)
    .where(eq(filingDeadlines.caseId, caseId))
    .orderBy(asc(filingDeadlines.dueDate))
}

export async function addDeadline(input: {
  caseId: string
  label: string
  dueDate: Date
}) {
  const current = await requireUser()
  if (!current.permissions.includes("case:edit")) {
    throw new Error("You do not have permission to manage deadlines")
  }
  await db.insert(filingDeadlines).values({
    caseId: input.caseId,
    label: input.label,
    dueDate: input.dueDate,
  })
  revalidatePath(`/cases/${input.caseId}`)
  revalidatePath("/dashboard")
}

export async function toggleDeadline(
  id: string,
  caseId: string,
  completed: boolean,
) {
  const current = await requireUser()
  if (!current.permissions.includes("case:edit")) {
    throw new Error("You do not have permission to manage deadlines")
  }
  await db.update(filingDeadlines).set({ completed }).where(eq(filingDeadlines.id, id))
  revalidatePath(`/cases/${caseId}`)
  revalidatePath("/dashboard")
}

export async function deleteDeadline(id: string, caseId: string) {
  const current = await requireUser()
  if (!current.permissions.includes("case:edit")) {
    throw new Error("You do not have permission to manage deadlines")
  }
  await db.delete(filingDeadlines).where(eq(filingDeadlines.id, id))
  revalidatePath(`/cases/${caseId}`)
  revalidatePath("/dashboard")
}
