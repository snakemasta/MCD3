"use client"

import { useState, useTransition } from "react"
import { Save } from "lucide-react"
import { saveSettings } from "@/app/actions/admin"
import type { SecuritySettings } from "@/lib/settings"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground text-pretty">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

export function SecuritySettingsForm({ settings }: { settings: SecuritySettings }) {
  const [form, setForm] = useState<SecuritySettings>(settings)
  const [isPending, startTransition] = useTransition()

  function set<K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function save() {
    startTransition(async () => {
      try {
        await saveSettings("security", form)
        toast.success("Security settings saved")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save settings")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>How members sign in and stay signed in.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="sessionTimeout">Session timeout (hours)</FieldLabel>
            <Input
              id="sessionTimeout"
              type="number"
              min={1}
              value={form.sessionTimeoutHours}
              onChange={(e) => set("sessionTimeoutHours", Number(e.target.value))}
            />
          </Field>
          <ToggleRow
            title="Require login"
            description="Force authentication before accessing the application."
            checked={form.requireLogin}
            onChange={(v) => set("requireLogin", v)}
          />
          <ToggleRow
            title="Invite only"
            description="Only allow new accounts created or invited by an administrator."
            checked={form.inviteOnly}
            onChange={(v) => set("inviteOnly", v)}
          />
          <Field>
            <FieldLabel>Disabled account behavior</FieldLabel>
            <Select
              value={form.disabledAccountBehavior}
              onValueChange={(v) =>
                set(
                  "disabledAccountBehavior",
                  (v as SecuritySettings["disabledAccountBehavior"]) ??
                    form.disabledAccountBehavior,
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="block_login">Block login entirely</SelectItem>
                <SelectItem value="read_only">Allow read-only access</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
          <CardDescription>Control what members can see by default.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel>Case visibility</FieldLabel>
            <Select
              value={form.caseVisibility}
              onValueChange={(v) =>
                set("caseVisibility", (v as SecuritySettings["caseVisibility"]) ?? form.caseVisibility)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cases visible to everyone</SelectItem>
                <SelectItem value="assigned_only">Only assigned cases</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Team visibility</FieldLabel>
            <Select
              value={form.teamVisibility}
              onValueChange={(v) =>
                set("teamVisibility", (v as SecuritySettings["teamVisibility"]) ?? form.teamVisibility)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Visible to everyone</SelectItem>
                <SelectItem value="admins_only">Administrators only</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <ToggleRow
            title="Restrict admin pages"
            description="Only members whose role grants admin access can open the admin panel."
            checked={form.adminOnlyPages}
            onChange={(v) => set("adminOnlyPages", v)}
          />
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
