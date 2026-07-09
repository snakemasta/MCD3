import Link from "next/link"
import {
  Users,
  ShieldCheck,
  Briefcase,
  FileStack,
  ScrollText,
  UserX,
  ArrowRight,
  HeartPulse,
  BrainCircuit,
} from "lucide-react"
import { getAdminStats, listAuditLogs } from "@/app/actions/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const QUICK_LINKS = [
  { href: "/admin/health", label: "System Health", icon: HeartPulse },
  { href: "/admin/users", label: "Manage Users", icon: Users },
  { href: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck },
  { href: "/admin/case-settings", label: "Case Settings", icon: Briefcase },
  { href: "/admin/templates", label: "Motion Templates", icon: FileStack },
  { href: "/admin/memory-bank", label: "Memory Bank", icon: BrainCircuit },
]

export default async function AdminOverviewPage() {
  const [stats, recent] = await Promise.all([
    getAdminStats(),
    listAuditLogs({ limit: 6 }),
  ])

  const cards = [
    { label: "Team Members", value: stats.users, icon: Users, hint: `${stats.admins} admin` },
    { label: "Disabled Accounts", value: stats.disabledUsers, icon: UserX },
    { label: "Roles", value: stats.roles, icon: ShieldCheck },
    { label: "Total Cases", value: stats.cases, icon: Briefcase },
    { label: "Templates", value: stats.templates, icon: FileStack },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{c.value}</p>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  {c.hint && (
                    <p className="text-xs text-muted-foreground">{c.hint}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {QUICK_LINKS.map((l) => {
              const Icon = l.icon
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="size-4 text-primary" />
                    {l.label}
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="size-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              recent.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{log.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.actorName ?? "System"}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 font-normal">
                    {timeAgo(log.createdAt)}
                  </Badge>
                </div>
              ))
            )}
            <Link
              href="/admin/audit-logs"
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all logs <ArrowRight className="size-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
