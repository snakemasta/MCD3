"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { saveSettings } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { playNotificationSound, unlockAudio } from "@/lib/notification-sound"
import { SOUND_TYPE_LABELS, type NotificationSoundType } from "@/lib/notification-categories"
import type { NotificationSettings } from "@/lib/settings"

interface RoleOption {
  key: string
  label: string
}

const SOUND_ITEMS = Object.fromEntries(
  Object.entries(SOUND_TYPE_LABELS).map(([k, v]) => [k, v]),
) as Record<string, string>

export function NotificationSettingsForm({
  settings,
  roleOptions,
}: {
  settings: NotificationSettings
  roleOptions: RoleOption[]
}) {
  const [state, setState] = useState<NotificationSettings>({
    soundsEnabled: settings.soundsEnabled,
    roleSoundEnabled: settings.roleSoundEnabled ?? {},
    defaultSoundType: settings.defaultSoundType ?? "chime",
    defaultVolume: settings.defaultVolume ?? 70,
  })
  const [pending, startTransition] = useTransition()

  function setRoleEnabled(roleKey: string, enabled: boolean) {
    setState((s) => ({
      ...s,
      roleSoundEnabled: { ...s.roleSoundEnabled, [roleKey]: enabled },
    }))
  }

  function save() {
    startTransition(async () => {
      try {
        await saveSettings("notification", state)
        toast.success("Notification settings saved")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-5 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="global-sounds" className="text-sm font-medium">
              Notification sounds
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
              Master switch. When off, no audible alerts play for anyone, regardless of personal
              preferences.
            </p>
          </div>
          <Switch
            id="global-sounds"
            checked={state.soundsEnabled}
            onCheckedChange={(v) => setState((s) => ({ ...s, soundsEnabled: v }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Default sound</Label>
            <div className="flex items-center gap-2">
              <Select
                items={SOUND_ITEMS}
                value={state.defaultSoundType}
                onValueChange={(v) =>
                  setState((s) => ({ ...s, defaultSoundType: v ?? "chime" }))
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOUND_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  unlockAudio()
                  playNotificationSound(
                    state.defaultSoundType as NotificationSoundType,
                    state.defaultVolume,
                  )
                }}
              >
                Test
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Applied to users who haven&apos;t chosen their own.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="default-volume" className="text-sm font-medium">
              Default volume: {state.defaultVolume}%
            </Label>
            <input
              id="default-volume"
              type="range"
              min={0}
              max={100}
              step={5}
              value={state.defaultVolume}
              onChange={(e) => setState((s) => ({ ...s, defaultVolume: Number(e.target.value) }))}
              className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-sm font-medium">Sound by role</h2>
          <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
            Disable notification sounds for entire roles. Individual users can still mute themselves,
            but cannot enable sound for a role disabled here.
          </p>
        </div>
        <div className="flex flex-col divide-y divide-border">
          {roleOptions.map((role) => {
            const enabled = state.roleSoundEnabled[role.key] !== false
            return (
              <div key={role.key} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-sm">{role.label}</span>
                <Switch
                  checked={enabled}
                  disabled={!state.soundsEnabled}
                  onCheckedChange={(v) => setRoleEnabled(role.key, v)}
                />
              </div>
            )
          })}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </div>
  )
}
