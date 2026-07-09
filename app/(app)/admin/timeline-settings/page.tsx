import { listAllOptions, getSettingsForAdmin } from "@/app/actions/admin"
import { OPTION_CATEGORIES } from "@/lib/constants"
import { OptionListEditor } from "@/components/admin/option-list-editor"
import { TimelineSettingsForm } from "@/components/admin/timeline-settings-form"
import type { OptionRow } from "@/app/actions/admin"

const TIMELINE_KEYS = ["timelineEventTypes", "timelineEventCategories"]

export default async function TimelineSettingsPage() {
  const [all, settings] = await Promise.all([
    listAllOptions() as Promise<OptionRow[]>,
    getSettingsForAdmin("timeline"),
  ])

  const byCategory = new Map<string, OptionRow[]>()
  for (const row of all) {
    const list = byCategory.get(row.category) ?? []
    list.push(row)
    byCategory.set(row.category, list)
  }

  const defs = OPTION_CATEGORIES.filter((c) => TIMELINE_KEYS.includes(c.key))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Timeline Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Configure timeline event types and the reminder windows used to flag
          overdue tasks and upcoming court dates.
        </p>
      </div>

      <TimelineSettingsForm settings={settings} />

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
