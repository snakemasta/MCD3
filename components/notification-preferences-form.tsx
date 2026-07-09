"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Bell, BellOff, Volume2, Play } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_SOUND_TYPES,
  type NotificationSoundType,
} from "@/lib/notification-categories"
import { playNotificationSound, unlockAudio } from "@/lib/notification-sound"
import { saveMyNotificationPreferences } from "@/app/actions/notification-preferences"
import type { ResolvedNotificationPreferences } from "@/lib/notification-preferences"

interface Props {
  initial: ResolvedNotificationPreferences
}

export function NotificationPreferencesForm({ initial }: Props) {
  const [pending, startTransition] = useTransition()

  const [soundEnabled, setSoundEnabled] = useState(initial.soundEnabled)
  const [toastEnabled, setToastEnabled] = useState(initial.toastEnabled)
  const [volume, setVolume] = useState(initial.volume)
  const [soundType, setSoundType] = useState<NotificationSoundType>(initial.soundType)
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(initial.quietHoursEnabled)
  const [quietStart, setQuietStart] = useState(initial.quietStart)
  const [quietEnd, setQuietEnd] = useState(initial.quietEnd)
  const [categories, setCategories] = useState<Record<string, boolean>>(initial.categories ?? {})

  const platformDisabled = !initial.globalSoundsEnabled || !initial.roleSoundAllowed

  function categoryEnabled(key: string): boolean {
    return categories[key] !== false
  }

  function toggleCategory(key: string, value: boolean) {
    setCategories((prev) => ({ ...prev, [key]: value }))
  }

  function handleTest() {
    unlockAudio()
    const played = playNotificationSound(soundType, soundEnabled ? volume : 0)
    toast("Test notification", {
      description: soundEnabled
        ? "This is how your notifications will sound and look."
        : "Sound is off — this is how notifications will look.",
    })
    if (soundEnabled && !played) {
      toast.error("Your browser blocked audio. Interact with the page and try again.")
    }
  }

  function handleSave() {
    startTransition(async () => {
      const res = await saveMyNotificationPreferences({
        soundEnabled,
        toastEnabled,
        volume,
        soundType,
        quietHoursEnabled,
        quietStart,
        quietEnd,
        categories,
      })
      if (res.ok) toast.success("Notification preferences saved")
      else toast.error(res.error)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {platformDisabled && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          <BellOff className="mt-0.5 size-4 shrink-0" />
          <p>
            {initial.globalSoundsEnabled
              ? "Notification sounds are currently disabled for your role by an administrator. You can still configure toasts and your preferences below."
              : "Notification sounds are turned off platform-wide by an administrator. You can still configure toasts and your preferences below."}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            Sound & alerts
          </CardTitle>
          <CardDescription>Control how you are alerted when new notifications arrive.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Notification sounds</p>
              <p className="text-xs text-muted-foreground">Play a sound when a new notification arrives.</p>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} aria-label="Notification sounds" />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Toast notifications</p>
              <p className="text-xs text-muted-foreground">Show a pop-up toast for new notifications.</p>
            </div>
            <Switch checked={toastEnabled} onCheckedChange={setToastEnabled} aria-label="Toast notifications" />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="soundType" className="text-sm font-medium">
                Sound type
              </label>
              <Select
                value={soundType}
                onValueChange={(v) => {
                  setSoundType(v as NotificationSoundType)
                  unlockAudio()
                  if (soundEnabled) playNotificationSound(v as NotificationSoundType, volume)
                }}
              >
                <SelectTrigger id="soundType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_SOUND_TYPES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="volume" className="flex items-center justify-between text-sm font-medium">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="size-4 text-muted-foreground" />
                  Volume
                </span>
                <span className="tabular-nums text-xs text-muted-foreground">{volume}%</span>
              </label>
              <input
                id="volume"
                type="range"
                min={0}
                max={100}
                step={5}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                aria-label="Volume"
              />
            </div>
          </div>

          <div>
            <Button type="button" variant="outline" onClick={handleTest} className="gap-2">
              <Play className="size-4" />
              Test notification sound
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quiet hours</CardTitle>
          <CardDescription>Silence notification sounds during a set time range each day.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Enable quiet hours</p>
              <p className="text-xs text-muted-foreground">No sounds will play during this window.</p>
            </div>
            <Switch checked={quietHoursEnabled} onCheckedChange={setQuietHoursEnabled} aria-label="Enable quiet hours" />
          </div>
          {quietHoursEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="quietStart" className="text-sm font-medium">
                  From
                </label>
                <Input
                  id="quietStart"
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="quietEnd" className="text-sm font-medium">
                  To
                </label>
                <Input id="quietEnd" type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification categories</CardTitle>
          <CardDescription>Choose which kinds of notifications play a sound and show a toast.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col">
          {NOTIFICATION_CATEGORIES.filter((c) => c.key !== "general").map((c, i) => (
            <div key={c.key}>
              {i > 0 && <Separator />}
              <div className="flex items-center justify-between gap-4 py-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </div>
                <Switch
                  checked={categoryEnabled(c.key)}
                  onCheckedChange={(v) => toggleCategory(c.key, v)}
                  aria-label={c.label}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save preferences"}
        </Button>
      </div>
    </div>
  )
}
