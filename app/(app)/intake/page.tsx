import Link from "next/link"
import { ArrowRight, Sparkles, UserCircle2 } from "lucide-react"
import { requireStaffPermission } from "@/lib/session"
import { listIntakes, intakeStatusCounts } from "@/lib/intake"
import { getSettings } from "@/lib/settings"
import { statusLabel, urgencyLabel } from "@/lib/intake-config"
import { INTAKE_STATUSES, INTAKE_TYPES, labelOf } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { IntakeStatusBadge, UrgencyBadge } from "@/components/portal/intake-status-badge"

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default async function IntakeQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>
}) {
  await requireStaffPermission("intake:review")
  const { status, type } = await searchParams

  const [intakes, counts, settings] = await Promise.all([
    listIntakes({ status, type }),
    intakeStatusCounts(),
    getSettings("civilian"),
  ])

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const tabs = [
    { value: "", label: "All", count: total },
    ...INTAKE_STATUSES.map((s) => ({
      value: s.value,
      label: s.label,
      count: counts[s.value] ?? 0,
    })),
  ]

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Informant Tips</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review incoming requests from clients and convert qualified ones into cases.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((t) => {
          const active = (status ?? "") === t.value
          const href = t.value ? `/intake?status=${t.value}` : "/intake"
          return (
            <Link
              key={t.value || "all"}
              href={href}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  active ? "bg-primary-foreground/20" : "bg-background/60",
                )}
              >
                {t.count}
              </span>
            </Link>
          )
        })}
      </div>

      {intakes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No intake requests{status ? ` with status "${statusLabel(settings, status)}"` : ""}.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {intakes.map((r) => (
            <Link key={r.id} href={`/intake/${r.id}`}>
              <Card className="transition-colors hover:border-primary/40 hover:bg-muted/30">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">
                        {r.subject || labelOf(INTAKE_TYPES, r.type)}
                      </p>
                      <UrgencyBadge urgency={r.urgency} label={urgencyLabel(settings, r.urgency)} />
                      {r.hasAiReview && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          <Sparkles className="size-3" />
                          AI reviewed
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>{labelOf(INTAKE_TYPES, r.type)}</span>
                      <span>·</span>
                      <span>{r.fullName}</span>
                      <span>·</span>
                      <span>{formatDate(r.createdAt)}</span>
                      {r.reviewerName && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <UserCircle2 className="size-3.5" />
                            {r.reviewerName}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <IntakeStatusBadge status={r.status} label={statusLabel(settings, r.status)} />
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
