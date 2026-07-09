import { MOTION_STATUSES, MOTION_TYPES, MOTION_FILING_SIDES, MOTION_URGENCY_LEVELS } from "@/lib/constants"

/** Evidence/exhibit link shape stored on motions. */
export interface EvidenceLink {
  label: string
  url: string
}

/** A minimal motion shape covering the fields the UI/AI rely on. */
export interface MotionLike {
  id?: string
  motionNumber?: string
  caseId?: string | null
  title?: string | null
  motionType?: string | null
  filingSide?: string | null
  filedByName?: string | null
  relief?: string | null
  argument?: string | null
  factualBasis?: string | null
  authoritiesCited?: string | null
  evidenceLinks?: EvidenceLink[] | unknown | null
  hearingRequested?: boolean | null
  urgency?: string | null
  status?: string | null
  ruling?: string | null
  judgeName?: string | null
}

export interface MotionChecklistItem {
  key: string
  label: string
  done: boolean
  /** "filer" items are the movant's responsibility; "judge" items are the court's. */
  audience: "filer" | "judge"
}

function hasText(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0
}

/** Compute the motion completeness checklist. Pure + client-safe. */
export function computeMotionChecklist(m: MotionLike): MotionChecklistItem[] {
  const links = Array.isArray(m.evidenceLinks) ? m.evidenceLinks : []
  return [
    { key: "title", label: "Motion titled", done: hasText(m.title), audience: "filer" },
    { key: "type", label: "Motion type selected", done: hasText(m.motionType), audience: "filer" },
    { key: "relief", label: "Relief requested stated", done: hasText(m.relief), audience: "filer" },
    { key: "argument", label: "Legal argument provided", done: hasText(m.argument), audience: "filer" },
    { key: "factualBasis", label: "Factual basis included", done: hasText(m.factualBasis), audience: "filer" },
    { key: "authorities", label: "Authorities cited", done: hasText(m.authoritiesCited), audience: "filer" },
    { key: "exhibits", label: "Supporting exhibits attached", done: links.length > 0, audience: "filer" },
    { key: "ruling", label: "Court ruling entered", done: hasText(m.ruling), audience: "judge" },
  ]
}

/** Percentage (0-100) of filer-owned checklist items completed. */
export function motionChecklistCompletion(
  items: MotionChecklistItem[],
  audience: "filer" | "all" = "filer",
): number {
  const scoped = audience === "all" ? items : items.filter((i) => i.audience === "filer")
  if (scoped.length === 0) return 0
  const done = scoped.filter((i) => i.done).length
  return Math.round((done / scoped.length) * 100)
}

export function motionTypeLabel(value?: string | null, custom: { value: string; label: string }[] = []): string {
  if (!value) return "—"
  const all = [...MOTION_TYPES, ...custom]
  return all.find((t) => t.value === value)?.label ?? value
}

export function motionStatusLabel(value?: string | null, overrides: Record<string, string> = {}): string {
  if (!value) return "—"
  if (overrides[value]) return overrides[value]
  return MOTION_STATUSES.find((s) => s.value === value)?.label ?? value.replace(/_/g, " ")
}

export function motionSideLabel(value?: string | null): string {
  if (!value) return "—"
  return MOTION_FILING_SIDES.find((s) => s.value === value)?.label ?? value
}

export function motionUrgencyLabel(value?: string | null): string {
  if (!value) return "—"
  return MOTION_URGENCY_LEVELS.find((u) => u.value === value)?.label ?? value
}

/** Verdict from a merit score given configured thresholds. */
export function motionVerdictFromScore(
  score: number,
  thresholds: { pass: number; weak: number },
): "strong" | "needs_work" | "weak" {
  if (score >= thresholds.pass) return "strong"
  if (score <= thresholds.weak) return "weak"
  return "needs_work"
}

export const MOTION_VERDICT_META: Record<string, { label: string; className: string }> = {
  strong: { label: "Strong", className: "bg-green-100 text-green-800" },
  needs_work: { label: "Needs Work", className: "bg-yellow-100 text-yellow-800" },
  weak: { label: "Weak", className: "bg-red-100 text-red-800" },
}
