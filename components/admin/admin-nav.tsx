"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutGrid,
  Users,
  ShieldCheck,
  ShieldAlert,
  Briefcase,
  FolderArchive,
  CalendarClock,
  Wand2,
  FileStack,
  Sparkles,
  GaugeCircle,
  ScrollText,
  Settings2,
  Lock,
  Users2,
  Stamp,
  BrainCircuit,
  HeartPulse,
  BellRing,
  Scale,
} from "lucide-react"
import { cn } from "@/lib/utils"

const SECTIONS: {
  group: string
  items: { href: string; label: string; icon: React.ElementType }[]
}[] = [
  {
    group: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutGrid }],
  },
  {
    group: "Access",
    items: [
      { href: "/admin/users", label: "User Management", icon: Users },
      { href: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck },
      { href: "/admin/permissions", label: "Permissions Health Check", icon: ShieldAlert },
    ],
  },
  {
    group: "Case Configuration",
    items: [
      { href: "/admin/case-settings", label: "Case Settings", icon: Briefcase },
      { href: "/admin/evidence-settings", label: "Evidence Settings", icon: FolderArchive },
      { href: "/admin/timeline-settings", label: "Timeline Settings", icon: CalendarClock },
      { href: "/admin/auto-assign", label: "Auto-Assignment", icon: Wand2 },
      { href: "/admin/templates", label: "Motion Templates", icon: FileStack },
    ],
  },
  {
    group: "Informant Portal",
    items: [
      { href: "/admin/client-portal", label: "Portal & Intake", icon: Users2 },
    ],
  },
  {
    group: "Warrants",
    items: [
      { href: "/admin/warrant-settings", label: "Warrant Settings", icon: Stamp },
    ],
  },
  {
    group: "Prosecution",
    items: [
      { href: "/admin/prosecution-access", label: "Prosecution Access", icon: Scale },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { href: "/admin/ai-settings", label: "AI Settings", icon: Sparkles },
      { href: "/admin/memory-bank", label: "Memory Bank", icon: BrainCircuit },
      { href: "/admin/dashboard-settings", label: "Dashboard", icon: GaugeCircle },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/admin/health", label: "System Health", icon: HeartPulse },
      { href: "/admin/notification-settings", label: "Notifications", icon: BellRing },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
      { href: "/admin/system", label: "System Settings", icon: Settings2 },
      { href: "/admin/security", label: "Security", icon: Lock },
    ],
  },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-5" aria-label="Admin sections">
      {SECTIONS.map((section) => (
        <div key={section.group} className="flex flex-col gap-1">
          <p className="px-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {section.group}
          </p>
          {section.items.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("size-4 shrink-0", active && "text-primary")}
                />
                {item.label}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
