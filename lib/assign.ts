import type { Role } from "@/lib/constants"

export interface Candidate {
  userId: string
  name: string
  role: Role
  available: boolean
  activeCaseCount: number
  specialties: string[]
  /** Per-member cap on active cases; falls back to the configured default. */
  maxActiveCases?: number | null
}

export interface CaseForAssignment {
  caseType: string
  priority: string
  conflictFlag: boolean
  /** Specialty hints derived from the case (e.g. type label, charges). */
  specialtyHints: string[]
}

export interface ScoredCandidate extends Candidate {
  score: number
  reasons: string[]
}

/** Admin-configurable knobs that drive auto-assignment. */
export interface AutoAssignOptions {
  enabled: boolean
  byCaseType: boolean
  byPriority: boolean
  byAvailability: boolean
  byWorkload: boolean
  conflictCheck: boolean
  maxActiveCasesDefault: number
  /** Role keys that can be assigned as lead counsel. */
  counselRoles: string[]
  /** Role keys that can be assigned as paralegal/support. */
  paralegalRoles: string[]
}

export const DEFAULT_ASSIGN_OPTIONS: AutoAssignOptions = {
  enabled: true,
  byCaseType: true,
  byPriority: true,
  byAvailability: true,
  byWorkload: true,
  conflictCheck: true,
  maxActiveCasesDefault: 15,
  counselRoles: ["attorney", "public_defender"],
  paralegalRoles: ["paralegal"],
}

const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 1.5,
  high: 1.25,
  normal: 1,
  low: 0.85,
}

/**
 * Score a single candidate for a case. Higher is better.
 * Considers caseload, availability, specialty match, and case priority,
 * each gated by the admin-configured {@link AutoAssignOptions}.
 */
export function scoreCandidate(
  candidate: Candidate,
  legalCase: CaseForAssignment,
  options: AutoAssignOptions = DEFAULT_ASSIGN_OPTIONS,
): ScoredCandidate {
  const reasons: string[] = []
  let score = 50

  // Caseload: lighter loads score higher (−6 per active case).
  if (options.byWorkload) {
    score -= candidate.activeCaseCount * 6
    if (candidate.activeCaseCount === 0) reasons.push("No active cases")
    else reasons.push(`${candidate.activeCaseCount} active case(s)`)
  }

  // Availability.
  if (options.byAvailability) {
    if (candidate.available) {
      score += 20
      reasons.push("Available")
    } else {
      score -= 25
      reasons.push("Marked unavailable")
    }
  }

  // Specialty match (case-type driven).
  if (options.byCaseType) {
    const hints = legalCase.specialtyHints.map((h) => h.toLowerCase())
    const matches = candidate.specialties.filter((s) =>
      hints.some((h) => h.includes(s.toLowerCase()) || s.toLowerCase().includes(h)),
    )
    if (matches.length > 0) {
      score += 15 * matches.length
      reasons.push(`Specialty match: ${matches.join(", ")}`)
    }
  }

  // Priority amplifies the importance of load + availability.
  if (options.byPriority) {
    const weight = PRIORITY_WEIGHT[legalCase.priority] ?? 1
    score = Math.round(score * weight)
  }

  // Conflict flag: when a case is conflicted, only fully-available, low-load
  // members are safe choices, so penalize loaded members further.
  if (options.conflictCheck && legalCase.conflictFlag && candidate.activeCaseCount > 2) {
    score -= 15
    reasons.push("Conflict-sensitive: high load penalized")
  }

  return { ...candidate, score, reasons }
}

export interface AssignmentResult {
  counsel: ScoredCandidate | null
  paralegal: ScoredCandidate | null
  counselRanking: ScoredCandidate[]
}

/**
 * Pick the best counsel and best paralegal for a case, honoring the
 * admin-configured {@link AutoAssignOptions}. Candidates at or above their
 * max active caseload are excluded when workload weighting is enabled.
 */
export function autoAssign(
  candidates: Candidate[],
  legalCase: CaseForAssignment,
  options: AutoAssignOptions = DEFAULT_ASSIGN_OPTIONS,
): AssignmentResult {
  if (!options.enabled) {
    return { counsel: null, paralegal: null, counselRanking: [] }
  }

  const withinCapacity = candidates.filter((c) => {
    if (!options.byWorkload) return true
    const cap = c.maxActiveCases ?? options.maxActiveCasesDefault
    return c.activeCaseCount < cap
  })

  const scored = withinCapacity.map((c) => scoreCandidate(c, legalCase, options))

  const counselRanking = scored
    .filter((c) => options.counselRoles.includes(c.role))
    .sort((a, b) => b.score - a.score)

  const paralegals = scored
    .filter((c) => options.paralegalRoles.includes(c.role))
    .sort((a, b) => b.score - a.score)

  return {
    counsel: counselRanking[0] ?? null,
    paralegal: paralegals[0] ?? null,
    counselRanking,
  }
}
