"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Live refresh is implemented with safe polling: on an interval we call
 * `router.refresh()`, which re-runs the current route's Server Components on
 * the server. Because every page fetches its data through permission-aware
 * server queries, refreshes automatically respect role and case-access rules —
 * no client ever receives data it isn't allowed to see. Client component state
 * (open menus, in-progress form input, scroll position) is preserved across a
 * refresh, so background updates are non-disruptive.
 *
 * This is intentionally structured so the polling engine can later be swapped
 * for WebSockets or database subscriptions: callers only depend on the
 * `useLiveRefresh()` contract (`isRefreshing`, `lastUpdated`, `refreshNow`).
 */

interface LiveRefreshContextValue {
  /** Whether automatic background refresh is currently active. */
  enabled: boolean
  /** True while a refresh round-trip is in flight. */
  isRefreshing: boolean
  /** Timestamp of the last completed/triggered refresh. */
  lastUpdated: Date | null
  /** Trigger an immediate refresh (e.g. after a mutation). */
  refreshNow: () => void
  /** Pause/resume automatic background refresh. */
  setEnabled: (value: boolean) => void
}

const LiveRefreshContext = createContext<LiveRefreshContextValue | null>(null)

const NOOP: LiveRefreshContextValue = {
  enabled: false,
  isRefreshing: false,
  lastUpdated: null,
  refreshNow: () => {},
  setEnabled: () => {},
}

export function useLiveRefresh(): LiveRefreshContextValue {
  // Fall back to a no-op so components render safely outside a provider.
  return useContext(LiveRefreshContext) ?? NOOP
}

export function LiveRefreshProvider({
  children,
  intervalMs = 5000,
}: {
  children: React.ReactNode
  /** Poll cadence; spec calls for 5–10s on active pages. */
  intervalMs?: number
}) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(true)
  const [isRefreshing, startTransition] = useTransition()
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  // Avoid overlapping refreshes if a round-trip is slower than the interval.
  const inFlight = useRef(false)

  const refreshNow = useCallback(() => {
    if (inFlight.current) return
    inFlight.current = true
    startTransition(() => {
      router.refresh()
    })
    setLastUpdated(new Date())
  }, [router])

  // Clear the in-flight guard once the transition settles.
  useEffect(() => {
    if (!isRefreshing) inFlight.current = false
  }, [isRefreshing])

  // Seed the initial "last updated" time on mount.
  useEffect(() => {
    setLastUpdated(new Date())
  }, [])

  useEffect(() => {
    if (!enabled) return
    const tick = () => {
      // Don't poll a backgrounded tab — saves work and avoids stampedes.
      if (document.visibilityState === "visible") refreshNow()
    }
    const timer = setInterval(tick, intervalMs)
    // Refresh immediately when the user returns to or clicks into this window.
    // `visibilitychange` covers backgrounded/minimized tabs, while `focus`
    // covers switching between two visible windows side-by-side — the common
    // multi-user testing setup where a tick-delayed update looks like "not
    // updating". Together they make a window feel instantly current on focus.
    const onActive = () => {
      if (document.visibilityState === "visible") refreshNow()
    }
    document.addEventListener("visibilitychange", onActive)
    window.addEventListener("focus", onActive)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onActive)
      window.removeEventListener("focus", onActive)
    }
  }, [enabled, intervalMs, refreshNow])

  return (
    <LiveRefreshContext.Provider
      value={{ enabled, isRefreshing, lastUpdated, refreshNow, setEnabled }}
    >
      {children}
    </LiveRefreshContext.Provider>
  )
}

/**
 * Small "Live" badge for the top bar. Click to pause/resume live updates.
 */
export function LiveBadge({ className }: { className?: string }) {
  const { enabled, isRefreshing, lastUpdated, setEnabled } = useLiveRefresh()

  const title = enabled
    ? lastUpdated
      ? `Live updates on — last checked ${lastUpdated.toLocaleTimeString()}`
      : "Live updates on"
    : "Live updates paused — click to resume"

  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      title={title}
      aria-label={title}
      aria-pressed={enabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent",
        className,
      )}
    >
      {enabled ? (
        <span className="relative flex size-2">
          {isRefreshing ? (
            <RefreshCw className="size-3 animate-spin text-primary" />
          ) : (
            <>
              <span className="absolute inline-flex size-2 animate-ping rounded-full bg-green-500/70" />
              <span className="relative inline-flex size-2 rounded-full bg-green-500" />
            </>
          )}
        </span>
      ) : (
        <span className="inline-flex size-2 rounded-full bg-muted-foreground/50" />
      )}
      <span>{enabled ? "Live" : "Paused"}</span>
    </button>
  )
}

function relativeLabel(date: Date | null): string {
  if (!date) return "—"
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000))
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

/**
 * "Last updated" timestamp for lists and dashboards. Re-renders on a light
 * ticker so the relative label stays current between refreshes.
 */
export function LastUpdated({ className }: { className?: string }) {
  const { lastUpdated } = useLiveRefresh()
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      Updated {relativeLabel(lastUpdated)}
    </span>
  )
}
