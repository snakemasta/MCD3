import { listAllOptions, getSettingsForAdmin } from "@/app/actions/admin"
import { OPTION_CATEGORIES } from "@/lib/constants"
import { OptionListEditor } from "@/components/admin/option-list-editor"
import { EvidenceSettingsForm } from "@/components/admin/evidence-settings-form"
import type { OptionRow } from "@/app/actions/admin"

const EVIDENCE_KEYS = [
  "evidenceTypes",
  "evidenceStatuses",
  "evidenceLinkTypes",
  "evidenceTags",
]

export default async function EvidenceSettingsPage() {
  const [all, settings] = await Promise.all([
    listAllOptions() as Promise<OptionRow[]>,
    getSettingsForAdmin("evidence"),
  ])

  const byCategory = new Map<string, OptionRow[]>()
  for (const row of all) {
    const list = byCategory.get(row.category) ?? []
    list.push(row)
    byCategory.set(row.category, list)
  }

  const defs = OPTION_CATEGORIES.filter((c) => EVIDENCE_KEYS.includes(c.key))
  const linkTypeOptions = (byCategory.get("evidence_link_type") ?? []).map((o) => ({
    value: o.value,
    label: o.label,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Evidence Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Configure evidence types, review statuses, allowed link sources, and tag
          presets used throughout the evidence locker.
        </p>
      </div>

      <EvidenceSettingsForm settings={settings} linkTypeOptions={linkTypeOptions} />

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
