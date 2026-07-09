"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Scale, Home, FileText, FolderOpen, Plus, LogOut, Menu, X, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import type { AppInterface } from "@/lib/constants"
import {
  InterfaceSwitcher,
  buildSwitcherEntries,
} from "@/components/interface-switcher"
import {
  LiveRefreshProvider,
  LiveBadge,
} from "@/components/live-refresh"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const NAV = [
  { href: "/portal", label: "Home", icon: Home, exact: true },
  { href: "/portal/requests", label: "My Requests", icon: FileText },
  { href: "/portal/cases", label: "My Cases", icon: FolderOpen },
  { href: "/portal/library", label: "Penal Code / SOP Bank", icon: BookOpen },
]

export function PortalShell({
  user,
  firmName = "MCD CaseOps Platform",
  interfaces = [],
  adminAccess = false,
  children,
}: {
  user: { name: string; email: string }
  firmName?: string
  interfaces?: { id: AppInterface; label: string; description: string; homePath: string }[]
  adminAccess?: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const switcherEntries = buildSwitcherEntries(interfaces, adminAccess)

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

  function isActive(item: (typeof NAV)[number]) {
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + "/")
  }

  const navLinks = (onClick?: () => void) =>
    NAV.map((item) => {
      const active = isActive(item)
      const Icon = item.icon
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClick}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            active
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
          )}
        >
          <Icon className="size-4 shrink-0" />
          {item.label}
        </Link>
      )
    })

  return (
    <LiveRefreshProvider>
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scale className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{firmName}</p>
              <p className="text-xs text-muted-foreground">Informant Portal</p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {navLinks()}
          </nav>

          <div className="flex items-center gap-2">
            <LiveBadge className="hidden sm:inline-flex" />
            <div className="hidden w-44 sm:block">
              <InterfaceSwitcher entries={switcherEntries} current="portal" />
            </div>

            <Button
              size="sm"
              nativeButton={false}
              className="hidden gap-1.5 sm:inline-flex"
              render={<Link href="/portal/new" />}
            >
              <Plus data-icon="inline-start" />
              New Request
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    className="rounded-full"
                    aria-label="Account menu"
                  />
                }
              >
                <Avatar className="size-9">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span>{user.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} variant="destructive">
                  <LogOut data-icon="inline-start" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={() => setOpen((v) => !v)}
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary md:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-border md:hidden">
            <nav className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-3" aria-label="Mobile">
              <div className="pb-2">
                <InterfaceSwitcher entries={switcherEntries} current="portal" />
              </div>
              {navLinks(() => setOpen(false))}
              <Button
                nativeButton={false}
                className="mt-1 w-full justify-start gap-1.5"
                render={<Link href="/portal/new" onClick={() => setOpen(false)} />}
              >
                <Plus data-icon="inline-start" />
                New Request
              </Button>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:py-8">{children}</main>
    </div>
    </LiveRefreshProvider>
  )
}
