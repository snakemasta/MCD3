"use server"

import { asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { caseMessages, user } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"

export interface CaseMessageRow {
  id: string
  caseId: string
  authorId: string
  authorName: string
  body: string
  createdAt: Date
}

export async function listCaseMessages(
  caseId: string,
): Promise<CaseMessageRow[]> {
  await requireUser()
  const rows = await db
    .select({
      id: caseMessages.id,
      caseId: caseMessages.caseId,
      authorId: caseMessages.authorId,
      authorName: user.name,
      body: caseMessages.body,
      createdAt: caseMessages.createdAt,
    })
    .from(caseMessages)
    .leftJoin(user, eq(user.id, caseMessages.authorId))
    .where(eq(caseMessages.caseId, caseId))
    .orderBy(asc(caseMessages.createdAt))

  return rows.map((r) => ({
    ...r,
    authorName: r.authorName ?? "Assistant",
  }))
}

export async function postCaseMessage(input: {
  caseId: string
  body: string
}) {
  const current = await requireUser()
  await db.insert(caseMessages).values({
    caseId: input.caseId,
    authorId: current.id,
    body: input.body,
  })
  revalidatePath(`/cases/${input.caseId}`)
}
