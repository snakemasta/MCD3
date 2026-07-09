import Link from "next/link"
import { requireJudge } from "@/lib/session"
import { listCases } from "@/app/actions/cases"
import { listMotions } from "@/lib/motions"
import { labelOf, CASE_STATUSES } from "@/lib/constants"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Scale, FolderOpen, ArrowRight, Gavel } from "lucide-react"

export default async function JudgeCasesPage() {
  const judge = await requireJudge()
  if (!judge.permissions.includes("judge:case-authority")) {
    return (
      <main className="flex-1 p-6">
        <Card className="p-12 text-center text-sm text-muted-foreground">
          You do not have judicial authority over cases.
        </Card>
      </main>
    )
  }

  const [allCases, allMotions] = await Promise.all([listCases(), listMotions({})])

  // Count undecided motions per case.
  const openMotionCounts = new Map<string, number>()
  for (const m of allMotions) {
    if (["submitted", "under_review", "needs_more_info"].includes(m.status)) {
      openMotionCounts.set(m.caseId, (openMotionCounts.get(m.caseId) ?? 0) + 1)
    }
  }

  const active = allCases.filter((c) => c.status !== "closed")
  const closed = allCases.filter((c) => c.status === "closed")

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Scale className="size-5" />
        </span>
        <div>
          <h1 className="text-3xl font-bold">Cases</h1>
          <p className="text-muted-foreground">Every case under the court&apos;s authority.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active cases" value={active.length} icon={FolderOpen} />
        <StatCard label="Closed cases" value={closed.length} icon={Gavel} />
        <StatCard
          label="Open motions"
          value={[...openMotionCounts.values()].reduce((a, b) => a + b, 0)}
          icon={Scale}
        />
      </div>

      {allCases.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <FolderOpen className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No cases exist yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {allCases.map((c) => {
            const open = openMotionCounts.get(c.id) ?? 0
            return (
              <Card key={c.id} className="p-0 transition-colors hover:bg-muted/50">
                <Link href={`/judge/case/${c.id}`} className="flex items-center gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold">{c.title}</h3>
                      <Badge variant="secondary">{labelOf(CASE_STATUSES, c.status)}</Badge>
                      {open > 0 && (
                        <Badge className="border-transparent bg-yellow-100 text-yellow-800">
                          {open} open motion{open === 1 ? "" : "s"}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {c.caseNumber} · {c.clientName} · {labelOf(CASE_STATUSES, c.status)}
                    </p>
                    {c.charges ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{c.charges}</p>
                    ) : null}
                  </div>
                  <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof Scale
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </Card>
  )
}
