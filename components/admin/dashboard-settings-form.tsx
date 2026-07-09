"use client"

import { useState, useTransition } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { saveSettings } from "@/app/actions/admin"
import type { DashboardSettings } from "@/lib/settings"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"

export function DashboardSettingsForm({
  settings,
  cards,
}: {
  settings: DashboardSettings
  cards: { key: string; label: string }[]
}) {
  const [pending, startTransition] = useTransition()
  const [state, setState] = useState<Record<string, boolean>>(() => {
    const base: Record<string, boolean> = {}
    for (const c of cards) base[c.key] = settings.cards[c.key] ?? true
    return base
  })

  function save() {
    startTransition(async () => {
      try {
        await saveSettings("dashboard", { cards: state })
        toast.success("Dashboard settings saved")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save")
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-1 py-2">
          {cards.map((c) => (
            <label
              key={c.key}
              className="flex items-center justify-between gap-4 border-b py-3 last:border-0"
            >
              <span className="text-sm font-medium">{c.label}</span>
              <Switch
                checked={state[c.key]}
                onCheckedChange={(checked) =>
                  setState((prev) => ({ ...prev, [c.key]: checked }))
                }
              />
            </label>
          ))}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          <Save className="size-4" />
          {pending ? "Saving…" : "Save dashboard settings"}
        </Button>
      </div>
    </div>
  )
}
