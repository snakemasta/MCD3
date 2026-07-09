import Link from "next/link"
import { ArrowRight, FolderOpen, Calendar } from "lucide-react"
import { requireCivilian } from "@/lib/session"
import { getCivilianCases } from "@/lib/portal"
import { getSettings } from "@/lib/settings"
import { CASE_STATUSES, labelOf } from "@/lib/constants"
import { Card, CardContent } from "@/components/ui/card"

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default async function CasesPage() {
  const me = await requireCivilian()
  await getSettings("civilian")
  const cases = await getCivilianCases(me.id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">My Cases</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cases your legal team has opened and shared with you.
        </p>
      </div>

      {cases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <FolderOpen className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No active cases yet</p>
            <p className="max-w-sm text-xs text-muted-foreground text-pretty">
              When your request is accepted and becomes a case, it will appear here so you can
              follow along.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {cases.map((c) => (
            <Link key={c.caseId} href={`/portal/cases/${c.caseId}`}>
              <Card className="transition-colors hover:border-primary/40 hover:bg-muted/30">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.caseNumber}
                      {c.canViewStatus && ` · ${labelOf(CASE_STATUSES, c.status)}`}
                    </p>
                    {c.canViewCourtDates && c.courtDate && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="size-3.5" />
                        Next court date: {formatDate(c.courtDate)}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
