"use client"

import { useState, useTransition } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { saveSettings } from "@/app/actions/admin"
import type { EvidenceSettings } from "@/lib/settings"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface Props {
  settings: EvidenceSettings
  linkTypeOptions: { value: string; label: string }[]
}

export function EvidenceSettingsForm({ settings, linkTypeOptions }: Props) {
  const [allowed, setAllowed] = useState<string[]>(settings.allowedLinkTypes)
  const [pending, startTransition] = useTransition()

  function toggle(value: string, on: boolean) {
    setAllowed((prev) =>
      on ? [...new Set([...prev, value])] : prev.filter((v) => v !== value),
    )
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveSettings("evidence", { allowedLinkTypes: allowed })
        toast.success("Evidence settings saved")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save")
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Allowed link sources</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Choose which external link types team members may attach as evidence.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {linkTypeOptions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No link types defined yet. Add some in the Evidence Link Types list below.
          </p>
        )}
        {linkTypeOptions.map((opt) => (
          <Label
            key={opt.value}
            className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm font-normal"
          >
            <Checkbox
              checked={allowed.includes(opt.value)}
              onCheckedChange={(v) => toggle(opt.value, Boolean(v))}
            />
            {opt.label}
          </Label>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} disabled={pending} size="sm">
          <Save className="size-4" />
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}
