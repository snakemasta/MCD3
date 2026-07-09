"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Scale,
  LayoutDashboard,
  Briefcase,
  UserCheck,
  Users,
  Sparkles,
  Settings,
  Shield,
  Menu,
  X,
  LogOut,
  Plus,
  Inbox,
  Archive,
  BookOpen,
  FileText,
  ClipboardCheck,
  Gavel,
  FilePlus2,
  Stamp,
  ScrollText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ROLE_LABELS,
  hasPerm,
  type Role,
  type Permission,
  type AppInterface,
} from "@/lib/constants"
import {
  InterfaceSwitcher,
  buildSwitcherEntries,
} from "@/components/interface-switcher"
import {
  LiveRefreshProvider,
  LiveBadge,
  LastUpdated,
} from "@/components/live-refresh"
import { NotificationBell } from "@/components/notification-bell"
import type { ResolvedNotificationPreferences } from "@/lib/notification-preferences"

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  /** Show this item only if the user has this single permission. */
  perm?: string
  /** Show this item if the user has ANY of these permissions. */
  anyPerm?: string[]
  badge?: boolean
}

type SwitcherInterface = {
  id: AppInterface
  label: string
  description: string
  homePath: string
}

const APP_NAV: NavItem[] = [
  { href: "/dashboard", label: "Command Dashboard", icon: LayoutDashboard },
  { href: "/intake", label: "Informant Tips", icon: Inbox, perm: "intake:review", badge: true },
  { href: "/cases", label: "Active Cases", icon: Briefcase },
  { href: "/my-cases", label: "My Investigations", icon: UserCheck },
  { href: "/cold-cases", label: "Cold Cases", icon: Archive },
  { href: "/evidence-locker", label: "Evidence Locker", icon: Shield, perm: "evidence:manage" },
  { href: "/person-database", label: "Master Person Database", icon: Users },
  { href: "/vehicle-database", label: "Vehicle Database", icon: FileText },
  { href: "/gang-intel", label: "Gang Intelligence", icon: Shield },
  { href: "/drug-intel", label: "Drug Intelligence", icon: ClipboardCheck },
  { href: "/reports", label: "Reports", icon: FileText, perm: "report:view-all" },
  { href: "/warrants", label: "Warrants", icon: ScrollText, perm: "warrant:view-all" },
  { href: "/motions", label: "Court Filings", icon: Scale, perm: "motion:view-all" },
  { href: "/court-packets", label: "Court Packet Builder", icon: Gavel },
  { href: "/law-library", label: "Penal Code / SOP Bank", icon: BookOpen, perm: "law-library:view" },
  { href: "/case-depot", label: "Archive / Case Depot", icon: Archive },
  { href: "/team", label: "Team Members", icon: Users },
  { href: "/assistant", label: "Investigation AI", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
]

const LE_NAV: NavItem[] = [
  { href: "/le/reports", label: "Incident Reports", icon: FileText },
  { href: "/le/report/new", label: "New Report", icon: FilePlus2, perm: "report:submit" },
  { href: "/le/warrants", label: "Warrants", icon: ScrollText, perm: "warrant:view-all" },
  { href: "/le/warrant/new", label: "Request Warrant", icon: Stamp, perm: "warrant:submit" },
]

const PROSECUTION_NAV: NavItem[] = [
  { href: "/prosecution/review", label: "Review Queue", icon: ClipboardCheck, perm: "report:review" },
  { href: "/prosecution/cases", label: "Prosecution Cases", icon: Gavel, perm: "prosecution:view" },
    { href: "/prosecution/warrants", label: "Warrants", icon: ScrollText, perm: "warrant:view-all" },
    { href: "/prosecution/motions", label: "Motions", icon: Scale, perm: "motion:view-all" },
]

const JUDGE_NAV: NavItem[] = [
    { href: "/judge/queue", label: "Review Queue", icon: Gavel, perm: "warrant:review" },
    { href: "/judge/cases", label: "Cases", icon: Briefcase, perm: "judge:case-authority" },
    { href: "/judge/warrants", label: "All Warrants", icon: ScrollText, perm: "warrant:view-all" },
    {
      href: "/judge/motions",
      label: "Motions",
      icon: Scale,
      anyPerm: ["motion:view-all", "motion:review", "motion:rule"],
    },
]

function navForSurface(surface: AppInterface): NavItem[] {
  if (surface === "le") return LE_NAV
  if (surface === "prosecution") return PROSECUTION_NAV
  if (surface === "judge") return JUDGE_NAV
  return APP_NAV
}

interface AppShellProps {
  user: {
    name: string
    email: string
    role: Role
    permissions: string[]
    adminAccess: boolean
  }
  /** Which interface this shell is rendering (drives navigation). */
  surface: AppInterface
  /** Interfaces the user can switch between. */
  interfaces: SwitcherInterface[]
  appName?: string
  intakeOpenCount?: number
  /** Resolved per-user notification sound/toast preferences. */
  notificationPreferences?: ResolvedNotificationPreferences | null
  children: React.ReactNode
}

export function AppShell({
  user,
  surface,
  interfaces,
  appName = "Major Crimes Division",
  intakeOpenCount = 0,
  notificationPreferences = null,
  children,
}: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const nav = navForSurface(surface)
  const isMcdWorkspace = surface === "app"
  const switcherEntries = buildSwitcherEntries(interfaces, user.adminAccess)

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  async function signOut() {
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  const sidebar = (
    <div className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scale className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{appName}</p>
            <p className="text-xs text-muted-foreground">CaseOps Platform</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X className="size-5" />
        </Button>
      </div>

      <div className="px-3 pb-2">
        <InterfaceSwitcher entries={switcherEntries} current={surface} />
      </div>

      {isMcdWorkspace && hasPerm(user.permissions, "case:create") && (
        <div className="px-3 pb-2">
          <Button
            nativeButton={false}
            className="w-full justify-start gap-2"
            render={<Link href="/cases/new" onClick={() => setOpen(false)} />}
          >
            <Plus data-icon="inline-start" />
            New Investigation
          </Button>
        </div>
      )}

      <nav className="mt-2 flex flex-1 flex-col gap-1 px-3" aria-label="Main">
        {nav.filter((item) => {
          if (item.anyPerm) {
            return item.anyPerm.some((p) => hasPerm(user.permissions, p as Permission))
          }
          return !item.perm || hasPerm(user.permissions, item.perm as Permission)
        }).map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && intakeOpenCount > 0 && (
                <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-xs tabular-nums">
                  {intakeOpenCount}
                </Badge>
              )}
            </Link>
          )
        })}

        {user.adminAccess && (
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className={cn(
              "mt-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              pathname === "/admin" || pathname.startsWith("/admin/")
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50",
            )}
          >
            <Shield
              className={cn(
                "size-4 shrink-0",
                pathname === "/admin" || pathname.startsWith("/admin/")
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            />
            Admin Panel
          </Link>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent/50" />
            }
          >
            <Avatar className="size-9">
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-1">
              <span>{user.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
              <Badge variant="secondary" className="mt-1 w-fit">
                {ROLE_LABELS[user.role]}
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings data-icon="inline-start" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} variant="destructive">
                <LogOut data-icon="inline-start" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <LiveRefreshProvider>
      <div className="flex h-dvh overflow-hidden bg-background text-foreground">
        <div className="hidden lg:block">{sidebar}</div>

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              aria-label="Close menu"
              className="absolute inset-0 bg-black/60"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 left-0">{sidebar}</div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
            <button
              onClick={() => setOpen(true)}
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <Scale className="size-5 text-primary" />
              <span className="text-sm font-semibold">{appName}</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <LastUpdated className="hidden sm:inline" />
              <LiveBadge />
              <NotificationBell
                preferences={notificationPreferences}
                storageKey={user.email}
              />
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </LiveRefreshProvider>
  )
}
