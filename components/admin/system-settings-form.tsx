"use client"

import { useState, useTransition } from "react"
import { Save } from "lucide-react"
import { saveSettings } from "@/app/actions/admin"
import type { SystemSettings } from "@/lib/settings"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Field,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface Option {
  value: string
  label: string
}

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
]

export function SystemSettingsForm({
  settings,
  statuses,
  priorities,
}: {
  settings: SystemSettings
  statuses: Option[]
  priorities: Option[]
}) {
  const [form, setForm] = useState<SystemSettings>(settings)
  const [isPending, startTransition] = useTransition()

  function set<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function save() {
    startTransition(async () => {
      try {
        await saveSettings("system", form)
        toast.success("System settings saved")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save settings")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>How the application identifies itself.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="appName">Application name</FieldLabel>
            <Input
              id="appName"
              value={form.appName}
              onChange={(e) => set("appName", e.target.value)}
            />
            <FieldDescription>Shown in the sidebar and page titles.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="firmName">Firm / office name</FieldLabel>
            <Input
              id="firmName"
              value={form.firmName}
              onChange={(e) => set("firmName", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="logoUrl">Logo URL</FieldLabel>
            <Input
              id="logoUrl"
              value={form.logoUrl}
              placeholder="https://…"
              onChange={(e) => set("logoUrl", e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
          <CardDescription>Initial values applied to new cases.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Timezone</FieldLabel>
            <Select
              value={form.timezone}
              onValueChange={(v) => set("timezone", (v as string) ?? form.timezone)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Data retention (days)</FieldLabel>
            <Input
              type="number"
              min={0}
              value={form.dataRetentionDays}
              onChange={(e) => set("dataRetentionDays", Number(e.target.value))}
            />
          </Field>
          <Field>
            <FieldLabel>Default case status</FieldLabel>
            <Select
              value={form.defaultCaseStatus}
              onValueChange={(v) => set("defaultCaseStatus", (v as string) ?? form.defaultCaseStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Default case priority</FieldLabel>
            <Select
              value={form.defaultCasePriority}
              onValueChange={(v) => set("defaultCasePriority", (v as string) ?? form.defaultCasePriority)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a priority" />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operations</CardTitle>
          <CardDescription>Control system-wide availability.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Maintenance mode</p>
              <p className="text-sm text-muted-foreground text-pretty">
                Temporarily restrict the app to administrators only.
              </p>
            </div>
            <Switch
              checked={form.maintenanceMode}
              onCheckedChange={(v) => set("maintenanceMode", v)}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Private access</p>
              <p className="text-sm text-muted-foreground text-pretty">
                Require sign-in to view any part of the application.
              </p>
            </div>
            <Switch
              checked={form.accessMode === "private"}
              onCheckedChange={(v) => set("accessMode", v ? "private" : "public")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={isPending}>
          <Save className="size-4" />
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  )
}
