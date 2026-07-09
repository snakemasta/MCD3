import { db } from "@/lib/db"
import { lawLibrary } from "@/lib/db/schema"
import { eq, inArray, sql } from "drizzle-orm"

export interface LawContext {
  id: string
  title: string
  codeSection: string | null
  summary: string | null
  fullText: string
  documentText: string | null
}

/**
 * Fetch relevant laws from the library for AI analysis.
 * Searches by related charges or tags that match the case context.
 */
export async function fetchRelevantLaws(
  relatedCharges?: string[],
  tags?: string[],
  limit: number = 5,
): Promise<LawContext[]> {
  if (!relatedCharges?.length && !tags?.length) {
    return []
  }

  try {
    // Build query: find laws that match related charges or tags
    const conditions = []

    if (relatedCharges && relatedCharges.length > 0) {
      conditions.push(
        sql`${lawLibrary.relatedCharges}::text[] && ${ sql.raw(`ARRAY[${relatedCharges.map(c => `'${c}'`).join(",")}]`) }`,
      )
    }

    if (tags && tags.length > 0) {
      conditions.push(
        sql`${lawLibrary.tags}::text[] && ${ sql.raw(`ARRAY[${tags.map(t => `'${t}'`).join(",")}]`) }`,
      )
    }

    const combineCondition = sql.join(conditions, sql` OR `)

    const results = await db
      .select({
        id: lawLibrary.id,
        title: lawLibrary.title,
        codeSection: lawLibrary.codeSection,
        summary: lawLibrary.summary,
        fullText: lawLibrary.fullText,
        documentText: lawLibrary.documentText,
      })
      .from(lawLibrary)
      .where(
        sql`${eq(lawLibrary.status, "active")} AND (${combineCondition})`,
      )
      .limit(limit)

    return results
  } catch (err) {
    console.error("[law-library] Error fetching relevant laws:", err)
    return []
  }
}

/**
 * Format laws for inclusion in AI prompts as context.
 */
export function formatLawsForPrompt(laws: LawContext[]): string {
  if (laws.length === 0) return ""

  const formatted = laws
    .map((law) => {
      let text = `\n## ${law.title}`
      if (law.codeSection) text += ` (${law.codeSection})`
      text += "\n"
      if (law.summary) text += `**Summary:** ${law.summary}\n`
      text += `\n**Full Text:**\n${law.fullText}`
      if (law.documentText) {
        text += `\n\n**Document Content:**\n${law.documentText.substring(0, 2000)}` // Limit to 2000 chars to avoid token bloat
        if (law.documentText.length > 2000) text += "\n[...document truncated...]"
      }
      return text
    })
    .join("\n---\n")

  return `\n### Relevant Laws from Penal Code / SOP Bank\n${formatted}`
}

/**
 * Extract charge codes from case type to fetch relevant laws.
 */
export function chargeCodesForCaseType(caseType: string): string[] {
  const map: Record<string, string[]> = {
    criminal: ["18USC1001", "18USC1505", "18USC1519"],
    civil: ["42USC1983"],
    family: [],
    traffic: ["49USC14655"],
    appeal: [],
    other: [],
  }
  return map[caseType] || []
}
