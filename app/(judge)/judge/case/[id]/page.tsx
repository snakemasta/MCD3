import Link from "next/link"
import { notFound } from "next/navigation"
import { requireJudge } from "@/lib/session"
import { getCase } from "@/app/actions/cases"
import { listMotions } from "@/lib/motions"
import { listTimeline } from "@/app/actions/timeline"
import { getLinksForRecord } from "@/lib/record-links"
import { getSettings } from "@/lib/settings"
import { labelOf, CASE_STATUSES, MOTION_TYPES } from "@/lib/constants"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MotionStatusBadge } from "@/components/motions/motion-status-badge"
import { JudgeCaseControls } from "@/components/judge/judge-case-controls"
import { RelatedRecordsPanel } from "@/components/shared/related-records-panel"
import { motionTypeLabel, motionSideLabel } from "@/lib/motion-utils"
import { ArrowLeft, Scale, Clock } from "lucide-react"

export default async function JudgeCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const judge = await requireJudge()
  if (!judge.permissions.includes("judge:case-authority")) notFound()

  const caseData = await getCase(id)
  if (!caseData) notFound()

  const [caseMotions, timeline, links, motionSettings] = await Promise.all([
    listMotions({ caseId: id }),
    listTimeline(id),
    getLinksForRecord("case", id),
    getSettings("motion"),
  ])

  const typeOptions = [...MOTION_TYPES.map((t) => ({ value: t.value, label: t.label })), ...motionSettings.customTypes]

  return (
    <main className="flex-1 space-y-6 p-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        className="-ml-2 text-muted-foreground"
        render={<Link href="/judge/cases" />}
      >
        <ArrowLeft data-icon="inline-start" />
        All cases
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-balance">{caseData.title}</h1>
            <Badge variant="secondary">{labelOf(CASE_STATUSES, caseData.status)}</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            {caseData.caseNumber} · {caseData.clientName}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-3 p-5">
            <h2 className="font-semibold">Case Details</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Charges" value={caseData.charges || "—"} />
              <Field label="Case type" value={caseData.caseType} />
              <Field label="Assigned counsel" value={caseData.attorneyName || "—"} />
              <Field label="Priority" value={caseData.priority} />
            </dl>
            {caseData.notes ? (
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{caseData.notes}</p>
              </div>
            ) : null}
          </Card>

          <Card className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Scale className="size-4 text-primary" />
              <h2 className="font-semibold">Motions ({caseMotions.length})</h2>
            </div>
            {caseMotions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No motions filed on this case.</p>
            ) : (
              <div className="space-y-2">
                {caseMotions.map((m) => (
                  <Link
                    key={m.id}
                    href={`/judge/motion/${m.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.motionNumber} · {motionTypeLabel(m.motionType, typeOptions)} ·{" "}
                        {motionSideLabel(m.filingSide)}
                      </p>
                    </div>
                    <MotionStatusBadge status={m.status} labels={motionSettings.statusLabels} />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <h2 className="font-semibold">Master Timeline</h2>
            </div>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events recorded yet.</p>
            ) : (
              <ol className="space-y-3">
                {timeline.map((e: Record<string, unknown>) => (
                  <li key={String(e.id)} className="flex gap-3 border-l-2 border-border pl-3">
                    <div>
                      <p className="text-sm font-medium">{String(e.title)}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.date ? new Date(e.date as string).toLocaleString() : ""}
                        {e.eventType ? ` · ${String(e.eventType)}` : ""}
                      </p>
                      {e.description ? (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                          {String(e.description)}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <RelatedRecordsPanel fromType="case" fromId={id} links={links} canEdit />
        </div>

        <div className="space-y-6">
          <JudgeCaseControls
            caseId={id}
            currentStatus={caseData.status}
            statusOptions={CASE_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          />
        </div>
      </div>
    </main>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  )
}
