import Link from "next/link"
import {
  Briefcase,
  FolderOpen,
  UserCheck,
  AlertTriangle,
  CalendarClock,
  ShieldAlert,
  ArrowRight,
} from "lucide-react"
import { requireUser } from "@/lib/session"
import { getDashboardStats } from "@/app/actions/dashboard"
import { getSettings } from "@/lib/settings"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge, PriorityBadge } from "@/components/case-badges"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export default async function DashboardPage() {
  const user = await requireUser()
  const [stats, dashboard] = await Promise.all([
    getDashboardStats(),
    getSettings("dashboard"),
  ])
  const show = (key: string) => dashboard.cards[key] ?? true

  const cards = [
    { key: "totalCases", label: "Total Cases", value: stats.totalCases, icon: Briefcase },
    { key: "openCases", label: "Open Cases", value: stats.openCases, icon: FolderOpen },
    { key: "assignedCases", label: "My Cases", value: stats.myCases, icon: UserCheck },
    { key: "urgentCases", label: "High Priority", value: stats.urgentCases, icon: AlertTriangle },
  ].filter((c) => show(c.key))

  return (
    <div className="flex flex-col">
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description="Office-wide case overview and what needs your attention."
      >
        <Button nativeButton={false} render={<Link href="/cases" />}>
          View all cases
          <ArrowRight data-icon="inline-end" />
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map((c) => {
            const Icon = c.icon
            return (
              <Card key={c.label}>
                <CardContent className="flex items-center justify-between gap-3 pt-6">
                  <div>
                    <p className="text-sm text-muted-foreground">{c.label}</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight">
                      {c.value}
                    </p>
                  </div>
                  <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {show("recentActivity") && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Cases</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {stats.recentCases.length === 0 ? (
                <Empty className="border-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Briefcase />
                    </EmptyMedia>
                    <EmptyTitle>No cases yet</EmptyTitle>
                    <EmptyDescription>
                      Create your first case to get started.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                stats.recentCases.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.caseNumber} · {c.clientName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {c.conflictFlag && (
                        <ShieldAlert className="size-4 text-red-400" />
                      )}
                      <PriorityBadge priority={c.priority} />
                      <StatusBadge status={c.status} />
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
          )}

          {show("upcomingCourtDates") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-4 text-primary" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {stats.upcomingDeadlines.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No upcoming deadlines.
                </p>
              ) : (
                stats.upcomingDeadlines.map((d) => {
                  const due = new Date(d.dueDate)
                  const overdue = due.getTime() < Date.now()
                  return (
                    <Link
                      key={d.id}
                      href={`/cases/${d.caseId}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-accent/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.label}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {d.caseNumber}
                        </p>
                      </div>
                      <span
                        className={
                          overdue
                            ? "shrink-0 text-xs font-medium text-red-400"
                            : "shrink-0 text-xs text-muted-foreground"
                        }
                      >
                        {due.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </Link>
                  )
                })
              )}
              {stats.conflictCases > 0 && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
                  <ShieldAlert className="size-4 shrink-0" />
                  {stats.conflictCases} case
                  {stats.conflictCases > 1 ? "s" : ""} flagged for conflicts
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </div>
  )
}
