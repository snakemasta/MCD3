import "server-only"
import { and, desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { lawLibrary } from "@/lib/db/schema"
import { getSettings } from "@/lib/settings"

export interface RetrievedSource {
  id: string
  kind: "memory_bank" | "legal_authority"
  title: string
  codeSection: string | null
  category: string | null
  summary: string | null
  snippet: string
}

export interface RetrievalResult {
  /** Prompt-ready context block to append to the system/user prompt. */
  context: string
  /** Structured list of the sources used, for displaying citations. */
  sources: RetrievedSource[]
}

const EMPTY: RetrievalResult = { context: "", sources: [] }

function toSnippet(text: string | null, max = 1200): string {
  if (!text) return ""
  const t = text.trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}

/**
 * Retrieve supporting knowledge for an AI request from the Memory Bank and the
 * Penal Code / SOP Bank, honoring admin retrieval settings. Performs a keyword search
 * over titles, summaries, tags, full text, and document text. Only entries
 * flagged `aiEnabled` and `active` are eligible.
 */
export async function retrieveKnowledge(query: string): Promise<RetrievalResult> {
  const ai = await getSettings("ai")
  if (!ai.memoryBankRetrieval && !ai.lawLibraryRetrieval) return EMPTY

  const terms = Array.from(
    new Set(
      (query || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s§.-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4),
    ),
  ).slice(0, 12)
  if (terms.length === 0) return EMPTY

  // Which entry kinds are eligible based on settings.
  const allowedKinds: string[] = []
  if (ai.memoryBankRetrieval) allowedKinds.push("memory_bank")
  if (ai.lawLibraryRetrieval) allowedKinds.push("legal_authority")

  try {
    const likeClauses = terms.map(
      (t) =>
        sql`(lower(${lawLibrary.title}) like ${"%" + t + "%"} or lower(coalesce(${lawLibrary.summary}, '')) like ${"%" + t + "%"} or lower(coalesce(${lawLibrary.fullText}, '')) like ${"%" + t + "%"} or lower(coalesce(${lawLibrary.documentText}, '')) like ${"%" + t + "%"} or lower(coalesce(array_to_string(${lawLibrary.tags}, ' '), '')) like ${"%" + t + "%"})`,
    )
    const anyTerm = sql.join(likeClauses, sql` or `)

    const rows = await db
      .select({
        id: lawLibrary.id,
        title: lawLibrary.title,
        category: lawLibrary.category,
        codeSection: lawLibrary.codeSection,
        summary: lawLibrary.summary,
        fullText: lawLibrary.fullText,
        documentText: lawLibrary.documentText,
        entryKind: lawLibrary.entryKind,
      })
      .from(lawLibrary)
      .where(
        and(
          eq(lawLibrary.status, "active"),
          eq(lawLibrary.aiEnabled, true),
          sql`${lawLibrary.entryKind} = any(${allowedKinds})`,
          sql`(${anyTerm})`,
        ),
      )
      .orderBy(desc(lawLibrary.updatedAt))
      .limit(ai.maxRetrievedEntries)

    if (rows.length === 0) return EMPTY

    const sources: RetrievedSource[] = rows.map((r) => ({
      id: r.id,
      kind: (r.entryKind === "memory_bank" ? "memory_bank" : "legal_authority") as RetrievedSource["kind"],
      title: r.title,
      codeSection: r.codeSection,
      category: r.category,
      summary: r.summary,
      snippet: toSnippet(r.documentText || r.fullText || r.summary),
    }))

    const blocks = sources.map((s, i) => {
      const head = `[${i + 1}] ${s.title}${s.codeSection ? ` (${s.codeSection})` : ""} — ${
        s.kind === "memory_bank" ? "Memory Bank" : "Legal Authority"
      }`
      const body = [s.summary ? `Summary: ${s.summary}` : "", s.snippet].filter(Boolean).join("\n")
      return `${head}\n${body}`
    })

    const context = `\n### Retrieved Knowledge (cite by [number])\n${blocks.join("\n---\n")}`
    return { context, sources }
  } catch (err) {
    console.error("[ai-retrieval] retrieval failed:", err)
    return EMPTY
  }
}

/** A short instruction appended to prompts when citations are required. */
export async function citationInstruction(): Promise<string> {
  const ai = await getSettings("ai")
  if (!ai.requireCitations) return ""
  return "When you rely on any retrieved knowledge above, cite it inline using its [number]. If no sources are relevant, say so rather than inventing authority."
}
