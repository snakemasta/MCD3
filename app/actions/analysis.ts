"use server"

import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { aiAnalyses, cases } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"

export interface CaseAnalysisResult {
  strengthScore: number
  summary: string
  probableCause: {
    established: boolean
    explanation: string
  }
  contradictions: string[]
  weaknesses: string[]
  strengths: string[]
  recommendedStrategy: string
  likelyOutcomes: { outcome: string; likelihood: string }[]
}

export async function getLatestAnalysis(caseId: string) {
  await requireUser()
  const [row] = await db
    .select()
    .from(aiAnalyses)
    .where(eq(aiAnalyses.caseId, caseId))
    .orderBy(desc(aiAnalyses.createdAt))
    .limit(1)
  return row
    ? { id: row.id, createdAt: row.createdAt, result: row.result as CaseAnalysisResult }
    : null
}

export async function saveAnalysis(
  caseId: string,
  result: CaseAnalysisResult,
) {
  const current = await requireUser()
  if (!current.permissions.includes("ai:use")) {
    throw new Error("You do not have permission to run AI analysis")
  }
  await db.insert(aiAnalyses).values({ caseId, result })
  // Persist a short strategy summary on the case for quick reference.
  await db
    .update(cases)
    .set({ strategySummary: result.summary, updatedAt: new Date() })
    .where(eq(cases.id, caseId))
  revalidatePath(`/cases/${caseId}`)
}
