"use client"

import { useState, useTransition } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { saveSettings } from "@/app/actions/admin"
import type { TimelineSettings } from "@/lib/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"

export function TimelineSettingsForm({ settings }: { settings: TimelineSettings }) {
  const [overdue, setOverdue] = useState(String(settings.overdueWarningDays))
  const [reminder, setReminder] = useState(String(settings.courtDateReminderDays))
  const [pending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      try {
        await saveSettings("timeline", {
          overdueWarningDays: Math.max(0, Number(overdue) || 0),
          courtDateReminderDays: Math.max(0, Number(reminder) || 0),
        })
        toast.success("Timeline settings saved")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save")
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Reminder windows</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="overdue">Overdue warning (days)</FieldLabel>
          <Input
            id="overdue"
            type="number"
            min={0}
            value={overdue}
            onChange={(e) => setOverdue(e.target.value)}
          />
          <FieldDescription>
            Flag tasks as overdue this many days before the due date passes.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="reminder">Court date reminder (days)</FieldLabel>
          <Input
            id="reminder"
            type="number"
            min={0}
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
          />
          <FieldDescription>
            Surface upcoming court dates this many days in advance.
          </FieldDescription>
        </Field>
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
