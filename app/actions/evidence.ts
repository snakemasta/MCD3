"use server"

import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { evidence } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { logAudit } from "@/lib/audit"

export async function listEvidence(caseId: string) {
  await requireUser()
  return db
    .select()
    .from(evidence)
    .where(eq(evidence.caseId, caseId))
    .orderBy(desc(evidence.createdAt))
}

export async function addEvidence(input: {
  caseId: string
  title: string
  evidenceType: string
  link?: string
  description?: string
  tags?: string[]
  status?: string
  relatedCharge?: string
}) {
  const current = await requireUser()
  if (!current.permissions.includes("evidence:manage")) {
    throw new Error("You do not have permission to manage evidence")
  }
  await db.insert(evidence).values({
    caseId: input.caseId,
    title: input.title,
    evidenceType: input.evidenceType,
    link: input.link ?? null,
    description: input.description ?? null,
    tags: input.tags ?? [],
    status: input.status ?? "pending_review",
    relatedCharge: input.relatedCharge ?? null,
    addedById: current.id,
  })
  revalidatePath(`/cases/${input.caseId}`)
}

export async function updateEvidence(
  id: string,
  caseId: string,
  input: Partial<{
    title: string
    evidenceType: string
    link: string | null
    description: string | null
    summary: string | null
    tags: string[]
    status: string
    relatedCharge: string | null
  }>,
) {
  const current = await requireUser()
  if (!current.permissions.includes("evidence:manage")) {
    throw new Error("You do not have permission to manage evidence")
  }
  await db.update(evidence).set(input).where(eq(evidence.id, id))
  revalidatePath(`/cases/${caseId}`)
}

export async function deleteEvidence(id: string, caseId: string) {
  const current = await requireUser()
  if (!current.permissions.includes("evidence:manage")) {
    throw new Error("You do not have permission to manage evidence")
  }
  await db.delete(evidence).where(eq(evidence.id, id))
  await logAudit({
    actorId: current.id,
    actorName: current.name,
    action: "evidence.delete",
    category: "evidence",
    targetType: "evidence",
    targetId: id,
    summary: "Deleted evidence item",
    metadata: { caseId },
  })
  revalidatePath(`/cases/${caseId}`)
}
