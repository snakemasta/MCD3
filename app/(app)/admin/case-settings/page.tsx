import { listAllOptions } from "@/app/actions/admin"
import { OPTION_CATEGORIES } from "@/lib/constants"
import { OptionListEditor } from "@/components/admin/option-list-editor"
import type { OptionRow } from "@/app/actions/admin"

const CASE_KEYS = [
  "caseTypes",
  "caseStatuses",
  "casePriorities",
  "chargeCategories",
  "courtTypes",
  "deadlineTypes",
  "planCategories",
  "draftTypes",
]

export default async function CaseSettingsPage() {
  const all = (await listAllOptions()) as OptionRow[]
  const byCategory = new Map<string, OptionRow[]>()
  for (const row of all) {
    const list = byCategory.get(row.category) ?? []
    list.push(row)
    byCategory.set(row.category, list)
  }

  const defs = OPTION_CATEGORIES.filter((c) => CASE_KEYS.includes(c.key))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Case Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Manage the dropdown lists used across cases. Changes apply everywhere
          immediately — adding a status here makes it selectable on every case.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {defs.map((def) => (
          <OptionListEditor
            key={def.key}
            category={def.category}
            label={def.label}
            description={def.description}
            initialOptions={byCategory.get(def.category) ?? []}
          />
        ))}
      </div>
    </div>
  )
}
