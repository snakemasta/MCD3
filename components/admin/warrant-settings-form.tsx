"use client"

import { useState, useTransition } from "react"
import { Save, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { saveSettings } from "@/app/actions/admin"
import type { WarrantSettings } from "@/lib/settings"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

interface RoleOption {
  key: string
  label: string
}

function RoleCheckboxGroup({
  roles,
  selected,
  onChange,
}: {
  roles: RoleOption[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  function toggle(key: string, on: boolean) {
    onChange(on ? [...new Set([...selected, key])] : selected.filter((r) => r !== key))
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {roles.map((r) => (
        <Label
          key={r.key}
          className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm font-normal"
        >
          <Checkbox checked={selected.includes(r.key)} onCheckedChange={(v) => toggle(r.key, Boolean(v))} />
          {r.label}
        </Label>
      ))}
    </div>
  )
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

export function WarrantSettingsForm({
  settings,
  roleOptions,
}: {
  settings: WarrantSettings
  roleOptions: RoleOption[]
}) {
  const [state, setState] = useState<WarrantSettings>(settings)
  const [newType, setNewType] = useState({ value: "", label: "" })
  const [pending, startTransition] = useTransition()

  function patch<K extends keyof WarrantSettings>(key: K, value: WarrantSettings[K]) {
    setState((s) => ({ ...s, [key]: value }))
  }

  function addCustomType() {
    const value = newType.value.trim().toLowerCase().replace(/\s+/g, "_")
    const label = newType.label.trim()
    if (!value || !label) {
      toast.error("Enter both a value and a label")
      return
    }
    patch("customTypes", [...state.customTypes, { value, label }])
    setNewType({ value: "", label: "" })
  }

  function save() {
    startTransition(async () => {
      try {
        await saveSettings("warrant", state)
        toast.success("Warrant settings saved")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save")
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="text-sm font-semibold">Workflow Roles</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Choose which roles participate in each stage. (Permissions still gate actions; these guide
          assignment and notifications.)
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <Label className="text-sm font-medium">Can submit warrants</Label>
            <div className="mt-2">
              <RoleCheckboxGroup roles={roleOptions} selected={state.submitterRoles} onChange={(v) => patch("submitterRoles", v)} />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Can review warrants</Label>
            <div className="mt-2">
              <RoleCheckboxGroup roles={roleOptions} selected={state.reviewerRoles} onChange={(v) => patch("reviewerRoles", v)} />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Can approve / decide warrants</Label>
            <div className="mt-2">
              <RoleCheckboxGroup roles={roleOptions} selected={state.approverRoles} onChange={(v) => patch("approverRoles", v)} />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Can close out warrants</Label>
            <div className="mt-2">
              <RoleCheckboxGroup roles={roleOptions} selected={state.closerRoles} onChange={(v) => patch("closerRoles", v)} />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">Custom Warrant Types</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Add agency-specific warrant types beyond the built-in arrest, search, bench, and other.
        </p>
        <div className="mt-4 space-y-2">
          {state.customTypes.length === 0 && (
            <p className="text-sm text-muted-foreground">No custom types added.</p>
          )}
          {state.customTypes.map((t, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <span className="flex-1">
                {t.label} <span className="text-muted-foreground">({t.value})</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => patch("customTypes", state.customTypes.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${t.label}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs">Label</Label>
            <Input
              value={newType.label}
              onChange={(e) => setNewType((s) => ({ ...s, label: e.target.value }))}
              placeholder="e.g., Tracking Warrant"
              className="mt-1"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs">Value</Label>
            <Input
              value={newType.value}
              onChange={(e) => setNewType((s) => ({ ...s, value: e.target.value }))}
              placeholder="e.g., tracking"
              className="mt-1"
            />
          </div>
          <Button variant="outline" onClick={addCustomType}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">AI Scoring Thresholds</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Scores at or above the pass threshold are marked Pass; at or below the high-risk threshold are
          marked High Risk.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-medium">Pass threshold</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={state.scoringThresholds.pass}
              onChange={(e) =>
                patch("scoringThresholds", { ...state.scoringThresholds, pass: Number(e.target.value) })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">High-risk threshold</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={state.scoringThresholds.highRisk}
              onChange={(e) =>
                patch("scoringThresholds", { ...state.scoringThresholds, highRisk: Number(e.target.value) })
              }
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">Automation & Notifications</h2>
        <div className="mt-4 space-y-2.5">
          <ToggleRow
            label="Auto-create prosecution case on approval"
            description="When a warrant is approved, spin up a linked prosecution case with charges, timeline, and evidence."
            checked={state.autoCreateProsecutionCase}
            onChange={(v) => patch("autoCreateProsecutionCase", v)}
          />
          <ToggleRow
            label="Auto-create defense case when contested"
            description="When a defendant contests at closeout, create a linked defense intake case."
            checked={state.autoCreateDefenseCase}
            onChange={(v) => patch("autoCreateDefenseCase", v)}
          />
          <ToggleRow
            label="Notify officer on decision"
            checked={state.notifyOfficerOnDecision}
            onChange={(v) => patch("notifyOfficerOnDecision", v)}
          />
          <ToggleRow
            label="Notify state attorney on approval"
            checked={state.notifyStateAttorneyOnApproval}
            onChange={(v) => patch("notifyStateAttorneyOnApproval", v)}
          />
          <ToggleRow
            label="Notify defense on contested closeout"
            checked={state.notifyDefenseOnContest}
            onChange={(v) => patch("notifyDefenseOnContest", v)}
          />
          <ToggleRow
            label="Play notification sound"
            description="Plays a soft chime when new notifications arrive."
            checked={state.notificationSounds}
            onChange={(v) => patch("notificationSounds", v)}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          <Save className="size-4" />
          {pending ? "Saving…" : "Save Warrant Settings"}
        </Button>
      </div>
    </div>
  )
}
