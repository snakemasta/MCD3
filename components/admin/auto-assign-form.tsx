"use client"

import { useState, useTransition } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { saveSettings } from "@/app/actions/admin"
import type { AutoAssignSettings } from "@/lib/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"

interface Props {
  settings: AutoAssignSettings
  roles: { key: string; label: string; isCounsel: boolean }[]
}

const TOGGLES: {
  key: keyof AutoAssignSettings
  label: string
  description: string
}[] = [
  {
    key: "byCaseType",
    label: "Match by case type / specialty",
    description: "Favor members whose specialties align with the case type.",
  },
  {
    key: "byPriority",
    label: "Weight by priority",
    description: "Give urgent and high-priority cases stronger routing weight.",
  },
  {
    key: "byAvailability",
    label: "Respect availability",
    description: "Prefer members currently marked as available.",
  },
  {
    key: "byWorkload",
    label: "Balance workload",
    description: "Distribute cases toward members with lighter caseloads.",
  },
  {
    key: "conflictCheck",
    label: "Conflict-aware routing",
    description: "Penalize high-load members on conflict-flagged cases.",
  },
  {
    key: "manualOverride",
    label: "Allow manual override",
    description: "Let authorized users reassign after auto-assignment.",
  },
]

export function AutoAssignForm({ settings, roles }: Props) {
  const [state, setState] = useState<AutoAssignSettings>(settings)
  const [pending, startTransition] = useTransition()

  function setField<K extends keyof AutoAssignSettings>(
    key: K,
    value: AutoAssignSettings[K],
  ) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  function toggleRole(roleKey: string, on: boolean) {
    setState((prev) => ({
      ...prev,
      assigningRoles: on
        ? [...new Set([...prev.assigningRoles, roleKey])]
        : prev.assigningRoles.filter((r) => r !== roleKey),
    }))
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveSettings("auto_assign", {
          ...state,
          maxActiveCasesDefault: Math.max(1, Number(state.maxActiveCasesDefault) || 1),
        })
        toast.success("Auto-assignment rules saved")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save")
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold">Automatic assignment</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            When enabled, new cases are routed to the best-matched counsel and
            paralegal automatically.
          </p>
        </div>
        <Switch
          checked={state.enabled}
          onCheckedChange={(v) => setField("enabled", v)}
          aria-label="Enable auto-assignment"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Matching factors</h3>
        <div className="mt-3 divide-y divide-border">
          {TOGGLES.map((t) => (
            <div
              key={t.key}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
              <Switch
                checked={Boolean(state[t.key])}
                onCheckedChange={(v) => setField(t.key, v as never)}
                disabled={!state.enabled}
                aria-label={t.label}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <Field>
          <FieldLabel htmlFor="maxCases">Default max active cases</FieldLabel>
          <Input
            id="maxCases"
            type="number"
            min={1}
            className="max-w-40"
            value={String(state.maxActiveCasesDefault)}
            onChange={(e) =>
              setField("maxActiveCasesDefault", Number(e.target.value) as never)
            }
          />
          <FieldDescription>
            Members at or above this caseload are skipped during auto-assignment,
            unless they have a per-member override.
          </FieldDescription>
        </Field>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Assignable roles</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Choose which roles can receive auto-assigned cases. Counsel-eligible
          roles are configured per role in Roles &amp; Permissions.
        </p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {roles.map((r) => (
            <Label
              key={r.key}
              className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm font-normal"
            >
              <Checkbox
                checked={state.assigningRoles.includes(r.key)}
                onCheckedChange={(v) => toggleRole(r.key, Boolean(v))}
              />
              <span className="flex-1">{r.label}</span>
              {r.isCounsel && (
                <span className="text-xs text-muted-foreground">counsel</span>
              )}
            </Label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={pending}>
          <Save className="size-4" />
          {pending ? "Saving…" : "Save rules"}
        </Button>
      </div>
    </div>
  )
}
