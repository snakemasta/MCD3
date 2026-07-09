"use server"

import { and, eq, ne, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { cases, profile, user } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { type Role } from "@/lib/constants"

export interface TeamMember {
  userId: string
  name: string
  email: string
  role: Role
  title: string | null
  available: boolean
  specialties: string[]
  activeCaseCount: number
}

export async function listTeam(): Promise<TeamMember[]> {
  await requireUser()
  const rows = await db
    .select({
      userId: profile.userId,
      name: user.name,
      email: user.email,
      role: profile.role,
      title: profile.title,
      available: profile.available,
      specialties: profile.specialties,
      activeCaseCount: profile.activeCaseCount,
    })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .orderBy(user.name)

  return rows.map((r) => ({
    ...r,
    role: r.role as Role,
    specialties: r.specialties ?? [],
  }))
}

export async function updateMember(input: {
  userId: string
  role?: Role
  title?: string | null
  available?: boolean
  specialties?: string[]
}) {
  const current = await requireUser()
  const isSelf = current.id === input.userId
  const canManage = current.permissions.includes("team:manage")

  // Only members with team:manage can change roles or edit other members.
  if (input.role !== undefined && !canManage) {
    throw new Error("You do not have permission to change roles")
  }
  if (!isSelf && !canManage) {
    throw new Error("Not authorized to edit this member")
  }

  await db
    .update(profile)
    .set({
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.available !== undefined ? { available: input.available } : {}),
      ...(input.specialties !== undefined
        ? { specialties: input.specialties }
        : {}),
    })
    .where(eq(profile.userId, input.userId))

  if (input.role !== undefined) {
    await logAudit({
      actorId: current.id,
      actorName: current.name,
      action: "member.role_change",
      category: "user",
      targetType: "user",
      targetId: input.userId,
      summary: `Changed role to "${input.role}"`,
    })
  }

  revalidatePath("/team")
  revalidatePath("/settings")
  revalidatePath("/admin/users")
}

/** Recompute activeCaseCount for every member based on open assignments. */
export async function recomputeCaseCounts() {
  const members = await db.select({ userId: profile.userId }).from(profile)
  for (const m of members) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(cases)
      .where(
        and(
          ne(cases.status, "closed"),
          or(
            eq(cases.assignedAttorneyId, m.userId),
            eq(cases.assignedParalegalId, m.userId),
          ),
        ),
      )
    await db
      .update(profile)
      .set({ activeCaseCount: Number(n ?? 0) })
      .where(eq(profile.userId, m.userId))
  }
}
