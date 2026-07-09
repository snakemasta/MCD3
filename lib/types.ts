import type { UIMessage } from "ai"

export type Mode = "general" | "attorney" | "analyzer"

export interface ModeMeta {
  id: Mode
  title: string
  short: string
  description: string
}

export const MODES: ModeMeta[] = [
  {
    id: "general",
    title: "General Chat",
    short: "General",
    description: "A standard AI assistant for any question.",
  },
  {
    id: "attorney",
    title: "Investigation AI",
    short: "MCD AI",
    description:
      "Investigation support, probable cause review, report drafting, evidence-gap checks, and court packet preparation.",
  },
  {
    id: "analyzer",
    title: "Report Analyzer",
    short: "Analyzer",
    description:
      "Paste a report to identify missing elements, weak evidence, unsupported conclusions, and court-readiness gaps.",
  },
]

export interface Conversation {
  id: string
  mode: Mode
  title: string
  messages: UIMessage[]
  createdAt: number
  /** Analyzer-only: the pasted report text */
  report?: string
  /** Analyzer-only: the structured analysis result */
  analysis?: AnalysisResult
}

export interface AnalysisResult {
  verdict: "PASS" | "FAIL"
  summary: string
  probableCause: string
  timelineConsistent: boolean
  timelineNotes: string
  missingElements: string[]
  weakEvidence: string[]
  unsupportedConclusions: string[]
  strengths: string[]
  weaknesses: string[]
}
