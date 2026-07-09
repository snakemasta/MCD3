"use server"

import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { prosecutionAnalysis } from "@/lib/db/schema"
import { requireProsecution } from "@/lib/session"

/** Structured output of the Prosecution AI case-strength analysis. */
export interface ProsecutionAnalysisResult {
  /** Strength of the case FOR the prosecution, 0 (very weak) to 100 (very strong). */
  caseStrengthScore: number
  summary: string
  probableCause: {
    sufficient: boolean
    explanation: string
  }
  chargeElements: { charge: string; status: string; analysis: string }[]
  missingEvidence: string[]
  discoveryRisks: string[]
  likelyDefenseArguments: string[]
  strongerCharges: string[]
  lesserIncludedCharges: string[]
  evidenceRequests: string[]
  witnessQuestions: string[]
  pleaOptions: string[]
  warrantStrength: string
  policeReportStrength: string
  dismissalRisks: string[]
  recommendedNextSteps: string[]
}

export async function getLatestProsecutionAnalysis(caseId: string) {
  await requireProsecution()
  const [row] = await db
    .select()
    .from(prosecutionAnalysis)
    .where(eq(prosecutionAnalysis.caseId, caseId))
    .orderBy(desc(prosecutionAnalysis.createdAt))
    .limit(1)
  return row
    ? { id: row.id, createdAt: row.createdAt, result: row.result as ProsecutionAnalysisResult }
    : null
}

export async function saveProsecutionAnalysis(
  caseId: string,
  result: ProsecutionAnalysisResult,
) {
  const current = await requireProsecution()
  if (!current.permissions.includes("prosecution:ai")) {
    throw new Error("You do not have permission to run prosecution AI analysis")
  }
  await db.insert(prosecutionAnalysis).values({
    caseId,
    result,
    generatedById: current.id,
  })
  revalidatePath(`/prosecution/cases/${caseId}`)
}
