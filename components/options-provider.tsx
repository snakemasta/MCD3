"use client"

import { createContext, useContext, useMemo } from "react"
import { OPTION_CATEGORIES } from "@/lib/constants"

export interface Option {
  value: string
  label: string
}
export type OptionsConfig = Record<string, Option[]>

function clientDefaults(): OptionsConfig {
  const out: OptionsConfig = {}
  for (const c of OPTION_CATEGORIES) {
    out[c.key] = c.defaults.map((d) => ({ value: d.value, label: d.label }))
  }
  return out
}

const OptionsContext = createContext<OptionsConfig | null>(null)

export function OptionsProvider({
  config,
  children,
}: {
  config: OptionsConfig
  children: React.ReactNode
}) {
  return <OptionsContext.Provider value={config}>{children}</OptionsContext.Provider>
}

/**
 * Returns the DB-driven configurable option lists. Falls back to built-in
 * defaults when used outside a provider (keeps components resilient).
 */
export function useOptions(): OptionsConfig {
  const ctx = useContext(OptionsContext)
  return useMemo(() => ctx ?? clientDefaults(), [ctx])
}

/** Resolve a label for a value within a category list. */
export function optionLabel(list: Option[] | undefined, value: string): string {
  return list?.find((o) => o.value === value)?.label ?? value
}

/** Convert an option list into the `items` map base-ui Select expects. */
export function optionItems(list: Option[] | undefined): Record<string, string> {
  return Object.fromEntries((list ?? []).map((o) => [o.value, o.label]))
}
