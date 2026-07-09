"use client"

import { useState, useTransition } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { saveSettings } from "@/app/actions/admin"
import type { ProsecutionSettings } from "@/lib/settings"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

interface SectionDef {
  id: string
  label: string
  description: string
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <Label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 font-normal">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </Label>
  )
}

export function ProsecutionAccessForm({
  settings,
  sectionDefs,
}: {
  settings: ProsecutionSettings
  sectionDefs: SectionDef[]
}) {
  const [state, setState] = useState<ProsecutionSettings>(settings)
  const [pending, startTransition] = useTransition()

  function patch<K extends keyof ProsecutionSettings>(key: K, value: ProsecutionSettings[K]) {
    setState((s) => ({ ...s, [key]: value }))
  }

  function toggleSection(id: string, on: boolean) {
    setState((s) => ({ ...s, sections: { ...s.sections, [id]: on } }))
  }

  function save() {
    startTransition(async () => {
      try {
        await saveSettings("prosecution", state)
        toast.success("Prosecution access settings saved")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save")
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="text-sm font-semibold">Visible Case Sections</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Choose which sections of a defense-created case prosecutors and state attorneys can see.
          Prosecution-created cases are always fully visible to the prosecution.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {sectionDefs.map((def) => (
            <ToggleRow
              key={def.id}
              label={def.label}
              description={def.description}
              checked={state.sections?.[def.id] ?? true}
              onChange={(v) => toggleSection(def.id, v)}
            />
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">Private &amp; Civilian Data</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          These default to off. Enable only to share otherwise-private defense or civilian material
          with the prosecution. Enforced server-side.
        </p>
        <div className="mt-4 space-y-2.5">
          <ToggleRow
            label="Allow viewing defense notes"
            description="Internal defense-only strategy notes and attorney-client privileged notes."
            checked={state.canViewDefenseNotes}
            onChange={(v) => patch("canViewDefenseNotes", v)}
          />
          <ToggleRow
            label="Allow viewing defense AI output"
            description="Investigation AI private strategy assessments."
            checked={state.canViewDefenseAi}
            onChange={(v) => patch("canViewDefenseAi", v)}
          />
          <ToggleRow
            label="Allow viewing civilian-linked records"
            description="Civilian intake requests, questionnaire submissions, and civilian messages."
            checked={state.canViewCivilianRecords}
            onChange={(v) => patch("canViewCivilianRecords", v)}
          />
          <ToggleRow
            label="Separate prosecution and defense notes"
            description="When on, prosecutors never see defense notes inline even if otherwise enabled."
            checked={state.separateNotes}
            onChange={(v) => patch("separateNotes", v)}
          />
          <ToggleRow
            label="Share evidence with prosecution by default"
            description="When off, the evidence locker is restricted unless shared per case."
            checked={state.shareEvidenceByDefault}
            onChange={(v) => patch("shareEvidenceByDefault", v)}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          <Save className="size-4" />
          {pending ? "Saving…" : "Save Prosecution Access"}
        </Button>
      </div>
    </div>
  )
}
