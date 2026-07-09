import {
  Activity,
  AlertTriangle,
  Bell,
  Brain,
  Briefcase,
  CheckCircle2,
  Database,
  FileText,
  FolderArchive,
  Gavel,
  Scale,
  ScrollText,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react"
import { getSystemHealth } from "@/app/actions/admin"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "System Health — Admin",
  description: "System-wide health, record counts, and recent critical activity.",
}

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface StatItem {
  label: string
  value: number
  icon: React.ElementType
  hint?: string
}

function StatGrid({ title, items }: { title: string; items: StatItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-semibold tabular-nums">{item.value.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                {item.hint && <p className="text-xs text-muted-foreground">{item.hint}</p>}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default async function SystemHealthPage() {
  const health = await getSystemHealth()
  const { records: r, database, notifications, activity, recentCritical } = health

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="System Health"
        description="System-wide health, record counts, and recent critical activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div
              className={cn(
                "flex size-11 items-center justify-center rounded-lg",
                database.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
              )}
            >
              <Database className="size-5" />
            </div>
            <div>
              <p className="flex items-center gap-2 text-lg font-semibold">
                {database.ok ? "Operational" : "Unreachable"}
                {database.ok ? (
                  <CheckCircle2 className="size-4 text-green-600" />
                ) : (
                  <XCircle className="size-4 text-red-600" />
                )}
              </p>
              <p className="text-sm text-muted-foreground">Database · {database.latencyMs}ms</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Activity className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{activity.last24h.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Events (24h)</p>
              <p className="text-xs text-muted-foreground">{activity.last7d.toLocaleString()} in 7 days</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Bell className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{notifications.unread.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Unread notifications</p>
              <p className="text-xs text-muted-foreground">{notifications.total.toLocaleString()} total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <StatGrid
        title="People & Cases"
        items={[
          { label: "Users", value: r.users, icon: Users, hint: `${r.activeUsers} active` },
          { label: "Disabled", value: r.disabledUsers, icon: XCircle },
          { label: "Cases", value: r.cases, icon: Briefcase, hint: `${r.openCases} open` },
        ]}
      />

      <StatGrid
        title="Filings & Workflow"
        items={[
          { label: "Motions", value: r.motions, icon: Scale, hint: `${r.pendingMotions} pending` },
          { label: "Warrants", value: r.warrants, icon: Gavel, hint: `${r.pendingWarrants} pending` },
          { label: "Reports", value: r.reports, icon: FileText },
          { label: "Evidence", value: r.evidence, icon: FolderArchive },
          { label: "Timeline Events", value: r.timelineEvents, icon: ScrollText },
        ]}
      />

      <StatGrid
        title="Knowledge & AI"
        items={[
          { label: "Library Entries", value: r.knowledgeEntries, icon: FileText },
          { label: "Memory Bank", value: r.memoryBankEntries, icon: Brain },
          { label: "AI-Enabled", value: r.aiEnabledEntries, icon: Sparkles },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4" />
            Recent Critical Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {recentCritical.length === 0 ? (
            <p className="text-sm text-muted-foreground">No critical activity recorded.</p>
          ) : (
            recentCritical.map((log) => (
              <div key={log.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{log.summary}</p>
                  <p className="text-xs text-muted-foreground">{log.actorName ?? "System"}</p>
                </div>
                <Badge variant="outline" className="shrink-0 font-normal">
                  {timeAgo(log.createdAt)}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Generated {new Date(health.generatedAt).toLocaleString()}
      </p>
    </div>
  )
}
