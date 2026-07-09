import Link from "next/link"
import { FileText, FolderOpen, Plus, ArrowRight, Scale } from "lucide-react"
import { requireCivilian } from "@/lib/session"
import { getCivilianDashboard } from "@/lib/portal"
import { getSettings } from "@/lib/settings"
import { statusLabel } from "@/lib/intake-config"
import { INTAKE_TYPES, labelOf } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IntakeStatusBadge } from "@/components/portal/intake-status-badge"

export default async function PortalHomePage() {
  const me = await requireCivilian()
  const [data, settings] = await Promise.all([
    getCivilianDashboard(me.id),
    getSettings("civilian"),
  ])

  const firstName = me.name.split(" ")[0]
  const recentRequests = data.intakes.slice(0, 4)

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scale className="size-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-balance">
              Welcome, {firstName}
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
              {settings.welcomeMessage}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Button
            nativeButton={false}
            className="gap-1.5"
            render={<Link href="/portal/new" />}
          >
            <Plus data-icon="inline-start" />
            Start a New Request
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<FileText className="size-5 text-primary" />}
          label="Total Requests"
          value={data.counts.totalRequests}
        />
        <StatCard
          icon={<FileText className="size-5 text-amber-600 dark:text-amber-400" />}
          label="Open Requests"
          value={data.counts.openRequests}
        />
        <StatCard
          icon={<FolderOpen className="size-5 text-emerald-600 dark:text-emerald-400" />}
          label="Active Cases"
          value={data.counts.activeCases}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Recent Requests</CardTitle>
            <Link
              href="/portal/requests"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {recentRequests.length === 0 ? (
              <EmptyState
                title="No requests yet"
                body="Submit your first request and we'll review it promptly."
                cta={{ href: "/portal/new", label: "New Request" }}
              />
            ) : (
              recentRequests.map((r) => (
                <Link
                  key={r.id}
                  href={`/portal/requests/${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {r.subject || labelOf(INTAKE_TYPES, r.type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {labelOf(INTAKE_TYPES, r.type)}
                    </p>
                  </div>
                  <IntakeStatusBadge
                    status={r.status}
                    label={statusLabel(settings, r.status)}
                  />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">My Cases</CardTitle>
            <Link
              href="/portal/cases"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.cases.length === 0 ? (
              <EmptyState
                title="No active cases"
                body="When your request becomes a case, it will appear here."
              />
            ) : (
              data.cases.slice(0, 4).map((c) => (
                <Link
                  key={c.caseId}
                  href={`/portal/cases/${c.caseId}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.caseNumber}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string
  body: string
  cta?: { href: string; label: string }
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground text-pretty">{body}</p>
      {cta && (
        <Button
          size="sm"
          nativeButton={false}
          className="mt-1"
          render={<Link href={cta.href} />}
        >
          {cta.label}
        </Button>
      )}
    </div>
  )
}
