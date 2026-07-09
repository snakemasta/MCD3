"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Briefcase,
  UserRound,
  Siren,
  Gavel,
  Scale,
  ShieldCheck,
  Check,
  ChevronsUpDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { setActiveInterface } from "@/app/actions/interface"
import type { AppInterface } from "@/lib/constants"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** An entry can be a real interface or the special "admin" panel link. */
export type SwitcherId = AppInterface | "admin"

export interface SwitcherEntry {
  id: SwitcherId
  label: string
  description: string
  homePath: string
}

const ICONS: Record<SwitcherId, typeof Briefcase> = {
  app: Briefcase,
  portal: UserRound,
  le: Siren,
  prosecution: Gavel,
  judge: Scale,
  admin: ShieldCheck,
}

export function InterfaceSwitcher({
  entries,
  current,
  className,
}: {
  entries: SwitcherEntry[]
  current: SwitcherId
  className?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const active = entries.find((e) => e.id === current) ?? entries[0]
  // There may be no entries at all in edge cases (no accessible interfaces).
  if (!active) return null
  const ActiveIcon = ICONS[active.id]
  // The control only opens when there is more than one place to switch to.
  const canSwitch = entries.length > 1

  function go(entry: SwitcherEntry) {
    if (entry.id === current) return
    // Persist the last-used interface as a best-effort, non-blocking call so
    // navigation happens immediately even as the menu unmounts this item.
    if (entry.id !== "admin") {
      void setActiveInterface(entry.id).catch(() => {})
    }
    startTransition(() => {
      router.push(entry.homePath)
    })
  }

  // Shared visual for the trigger / static control.
  const face = (
    <>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <ActiveIcon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Interface
        </span>
        <span className="block truncate text-sm font-semibold">
          {active.label}
        </span>
      </span>
      <ChevronsUpDown
        className={cn(
          "size-4 shrink-0 text-muted-foreground",
          !canSwitch && "opacity-40",
        )}
      />
    </>
  )

  const faceClassName = cn(
    "flex w-full items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left transition-colors",
    canSwitch && "hover:bg-accent disabled:opacity-60",
    className,
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            disabled={pending || !canSwitch}
            aria-label={canSwitch ? "Switch interface" : `Current interface: ${active.label}`}
            className={faceClassName}
          />
        }
      >
        {face}
      </DropdownMenuTrigger>
      {canSwitch && (
        <DropdownMenuContent align="start" className="w-64">
          <div className="px-2 py-1.5 text-sm font-medium">Switch interface</div>
          <DropdownMenuSeparator />
          {entries.map((entry) => {
            const Icon = ICONS[entry.id]
            const isActive = entry.id === current
            return (
              <DropdownMenuItem
                key={entry.id}
                onClick={() => go(entry)}
                className="items-start gap-2.5 py-2"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">
                      {entry.label}
                    </span>
                    {isActive && <Check className="size-3.5 text-primary" />}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {entry.description}
                  </span>
                </span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}

/** Build switcher entries from a user's accessible interfaces + admin access. */
export function buildSwitcherEntries(
  interfaces: { id: AppInterface; label: string; description: string; homePath: string }[],
  adminAccess: boolean,
): SwitcherEntry[] {
  const entries: SwitcherEntry[] = interfaces.map((i) => ({
    id: i.id,
    label: i.label,
    description: i.description,
    homePath: i.homePath,
  }))
  if (adminAccess) {
    entries.push({
      id: "admin",
      label: "Admin Panel",
      description: "Manage users, roles, settings, and system data.",
      homePath: "/admin",
    })
  }
  return entries
}
