import Link from "next/link"
import { Plus, ArrowRight } from "lucide-react"
import { requireCivilian } from "@/lib/session"
import { getCivilianIntakes } from "@/lib/portal"
import { getSettings } from "@/lib/settings"
import { statusLabel, urgencyLabel } from "@/lib/intake-config"
import { INTAKE_TYPES, labelOf } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { IntakeStatusBadge, UrgencyBadge } from "@/components/portal/intake-status-badge"

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default async function RequestsPage() {
  const me = await requireCivilian()
  const [intakes, settings] = await Promise.all([
    getCivilianIntakes(me.id),
    getSettings("civilian"),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">My Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track the status of everything you&apos;ve submitted.
          </p>
        </div>
        <Button nativeButton={false} className="gap-1.5" render={<Link href="/portal/new" />}>
          <Plus data-icon="inline-start" />
          New
        </Button>
      </div>

      {intakes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-sm font-medium">You haven&apos;t submitted any requests yet</p>
            <p className="max-w-sm text-xs text-muted-foreground text-pretty">
              Start a request and our legal team will review your situation and follow up.
            </p>
            <Button
              size="sm"
              nativeButton={false}
              className="mt-2"
              render={<Link href="/portal/new" />}
            >
              Start a Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {intakes.map((r) => (
            <Link key={r.id} href={`/portal/requests/${r.id}`}>
              <Card className="transition-colors hover:border-primary/40 hover:bg-muted/30">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">
                        {r.subject || labelOf(INTAKE_TYPES, r.type)}
                      </p>
                      <UrgencyBadge urgency={r.urgency} label={urgencyLabel(settings, r.urgency)} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {labelOf(INTAKE_TYPES, r.type)} · Submitted {formatDate(r.createdAt)}
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
