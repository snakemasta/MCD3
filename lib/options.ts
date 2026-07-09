import "server-only"
import { cache } from "react"
import { asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { caseOptions } from "@/lib/db/schema"
import { OPTION_CATEGORIES } from "@/lib/constants"

export interface Option {
  value: string
  label: string
}

/** A map of every option category key -> its active options. */
export type OptionsConfig = Record<string, Option[]>

function defaults(): OptionsConfig {
  const out: OptionsConfig = {}
  for (const c of OPTION_CATEGORIES) {
    out[c.key] = c.defaults.map((d) => ({ value: d.value, label: d.label }))
  }
  return out
}

/**
 * Load every configurable option list (per-request cached). For any category
 * present in the DB the DB rows win (active only, ordered); otherwise the
 * built-in defaults are used so the app always has sane values.
 */
export const getOptionsConfig = cache(async (): Promise<OptionsConfig> => {
  const base = defaults()
  try {
    const rows = await db
      .select()
      .from(caseOptions)
      .orderBy(asc(caseOptions.sortOrder), asc(caseOptions.label))

    const byCategory = new Map<string, typeof rows>()
    for (const r of rows) {
      const list = byCategory.get(r.category) ?? []
      list.push(r)
      byCategory.set(r.category, list)
    }

    for (const def of OPTION_CATEGORIES) {
      const dbRows = byCategory.get(def.category)
      if (dbRows && dbRows.length > 0) {
        base[def.key] = dbRows
          .filter((r) => r.active)
          .map((r) => ({ value: r.value, label: r.label }))
      }
    }
    return base
  } catch {
    return base
  }
})

/** Resolve a display label for a value within a category key. */
export function labelFor(config: OptionsConfig, key: string, value: string): string {
  return config[key]?.find((o) => o.value === value)?.label ?? value
}
