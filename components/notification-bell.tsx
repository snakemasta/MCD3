"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { markRead, markAllRead } from "@/app/actions/notifications"
import { playNotificationSound, unlockAudio } from "@/lib/notification-sound"
import {
  deriveCategory,
  isWithinQuietHours,
  type NotificationSoundType,
} from "@/lib/notification-categories"
import type { ResolvedNotificationPreferences } from "@/lib/notification-preferences"

type Notification = {
  id: string
  type: string
  category: string | null
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface NotificationBellProps {
  /** Resolved per-user preferences (with global + role gates applied). */
  preferences?: ResolvedNotificationPreferences | null
  /** Stable key (email) used to namespace the per-user "seen" set in storage. */
  storageKey?: string
}

export function NotificationBell({ preferences, storageKey }: NotificationBellProps) {
  const router = useRouter()
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)

  // IDs we've already alerted on, persisted so a refresh never replays a sound.
  const seenRef = useRef<Set<string>>(new Set())
  const initializedRef = useRef(false)
  const prefsRef = useRef<ResolvedNotificationPreferences | null | undefined>(preferences)
  prefsRef.current = preferences

  const lsKey = storageKey ? `notif-seen:${storageKey}` : null

  const loadSeen = useCallback(() => {
    if (!lsKey) return new Set<string>()
    try {
      const raw = localStorage.getItem(lsKey)
      if (raw) return new Set<string>(JSON.parse(raw) as string[])
    } catch {
      /* ignore */
    }
    return new Set<string>()
  }, [lsKey])

  const persistSeen = useCallback(() => {
    if (!lsKey) return
    try {
      // Keep the stored set bounded.
      const arr = [...seenRef.current].slice(-300)
      localStorage.setItem(lsKey, JSON.stringify(arr))
    } catch {
      /* ignore */
    }
  }, [lsKey])

  /** Decide whether a sound may play for a given category right now. */
  const canPlaySound = useCallback((category: string): boolean => {
    const p = prefsRef.current
    if (!p) return false
    if (!p.globalSoundsEnabled || !p.roleSoundAllowed || !p.soundEnabled) return false
    if (p.categories?.[category] === false) return false
    if (p.quietHoursEnabled && isWithinQuietHours(p.quietStart, p.quietEnd)) return false
    return true
  }, [])

  const canToast = useCallback((category: string): boolean => {
    const p = prefsRef.current
    if (!p) return false
    if (!p.toastEnabled) return false
    if (p.categories?.[category] === false) return false
    return true
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      const list: Notification[] = data.items ?? []

      if (!initializedRef.current) {
        // First load after mount: treat everything currently present as already
        // seen so we never sound/toast for pre-existing notifications (incl. on
        // refresh). Merge with any persisted set.
        seenRef.current = loadSeen()
        for (const n of list) seenRef.current.add(n.id)
        persistSeen()
        initializedRef.current = true
      } else {
        // Find genuinely new, unacknowledged notifications.
        const fresh = list.filter((n) => !n.readAt && !seenRef.current.has(n.id))
        if (fresh.length > 0) {
          // Sound: play once per batch using the highest-priority new item's category.
          const soundable = fresh.find((n) => canPlaySound(n.category ?? deriveCategory(n.type, n.title)))
          if (soundable) {
            const p = prefsRef.current!
            playNotificationSound(p.soundType as NotificationSoundType, p.volume)
          }
          // Toast each new notification (respecting toast + category prefs).
          for (const n of fresh) {
            const category = n.category ?? deriveCategory(n.type, n.title)
            if (canToast(category)) {
              toast(n.title, {
                description: n.body ?? undefined,
                action: n.link
                  ? { label: "View", onClick: () => router.push(n.link as string) }
                  : undefined,
              })
            }
            seenRef.current.add(n.id)
          }
          persistSeen()
        }
      }

      setItems(list)
      setUnread(data.unread ?? 0)
    } catch {
      /* ignore network errors */
    }
  }, [loadSeen, persistSeen, canPlaySound, canToast, router])

  // Unlock audio on the first user gesture (browsers block autoplay otherwise).
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener("pointerdown", unlock, { once: true })
    window.addEventListener("keydown", unlock, { once: true })
    return () => {
      window.removeEventListener("pointerdown", unlock)
      window.removeEventListener("keydown", unlock)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  async function handleOpen(n: Notification) {
    if (!n.readAt) {
      await markRead(n.id)
      load()
    }
    if (n.link) router.push(n.link)
  }

  async function handleMarkAll() {
    await markAllRead()
    load()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent"
            aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
          />
        }
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] tabular-nums">
            {unread > 9 ? "9+" : unread}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleMarkAll}>
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleOpen(n)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-accent",
                  !n.readAt && "bg-primary/5",
                )}
              >
                <div className="flex w-full items-center gap-2">
                  {!n.readAt && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                  <span className="flex-1 text-sm font-medium leading-snug">{n.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                {n.body && (
                  <span className="line-clamp-2 pl-4 text-xs text-muted-foreground">{n.body}</span>
                )}
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
