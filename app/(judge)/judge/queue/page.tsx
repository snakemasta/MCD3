import Link from "next/link"
import { requireJudge } from "@/lib/session"
import { listJudgeQueue } from "@/lib/warrants"
import { getSettings } from "@/lib/settings"
import { WARRANT_TYPES } from "@/lib/constants"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { WarrantStatusBadge } from "@/components/warrants/warrant-status-badge"
import { warrantTypeLabel, riskLevelLabel } from "@/lib/warrant-utils"
import { Gavel, Clock, ShieldAlert, ArrowRight } from "lucide-react"

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  severe: "bg-red-100 text-red-800",
}

export default async function JudgeQueuePage() {
  await requireJudge()
  const [queue, settings] = await Promise.all([listJudgeQueue(), getSettings("warrant")])
  const typeOptions = [...WARRANT_TYPES, ...settings.customTypes]

  const needsInfo = queue.filter((w) => w.status === "needs_more_info")
  const pending = queue.filter((w) => w.status !== "needs_more_info")

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Gavel className="size-5" />
        </span>
        <div>
          <h1 className="text-3xl font-bold">Review Queue</h1>
          <p className="text-muted-foreground">Warrant requests awaiting judicial action.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting review" value={pending.length} icon={Clock} />
        <StatCard label="Awaiting officer response" value={needsInfo.length} icon={ShieldAlert} />
        <StatCard label="Total in queue" value={queue.length} icon={Gavel} />
      </div>

      {queue.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <Gavel className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">The queue is clear. No warrants need review right now.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {queue.map((w) => (
            <Card key={w.id} className="p-0 transition-colors hover:bg-muted/50">
              <Link href={`/judge/warrant/${w.id}`} className="flex items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold">{w.title}</h3>
                    <WarrantStatusBadge status={w.status} labels={settings.statusLabels} />
                    <Badge className={`${RISK_COLORS[w.riskLevel] ?? "bg-muted"} border-transparent`}>
                      {riskLevelLabel(w.riskLevel)} risk
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {w.warrantNumber} · {warrantTypeLabel(w.warrantType, typeOptions)} ·{" "}
                    {w.suspectName || "Unknown suspect"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {w.requestingOfficerName} · {w.agency || "—"} · Submitted{" "}
                    {new Date(w.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            </Card>
          ))}
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
  icon: typeof Gavel
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
