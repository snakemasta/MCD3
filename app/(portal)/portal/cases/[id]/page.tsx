import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Calendar, FileText, Link2, Sparkles, CheckCircle2, Circle } from "lucide-react"
import { requireCivilian } from "@/lib/session"
import { getCivilianCaseDetail } from "@/lib/portal"
import { CASE_STATUSES, INTAKE_EVIDENCE_TYPES, labelOf } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageThread } from "@/components/portal/message-thread"
import { CaseEvidenceEditor } from "@/components/portal/case-evidence-editor"
import { CloseCaseRequest } from "@/components/portal/close-case-request"
import { Badge } from "@/components/ui/badge"

function formatDate(d: Date | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default async function PortalCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const me = await requireCivilian()
  const detail = await getCivilianCaseDetail(me.id, id)
  if (!detail) notFound()

  const { access, case: c, sharedEvidence, sharedDrafts, sharedSummaries, courtDates, messages } =
    detail

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/portal/cases"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All cases
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-balance">{c.title}</h1>
              {c.status === "closed" && <Badge variant="secondary">Closed</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {c.caseNumber}
              {access.canViewStatus && ` · ${labelOf(CASE_STATUSES, c.status)}`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          {access.canViewAiSummaries && (c.strategySummary || sharedSummaries.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4 text-primary" />
                  Case Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {c.strategySummary && (
                  <p className="text-sm leading-relaxed text-pretty">{c.strategySummary}</p>
                )}
                {sharedSummaries.map((s) => {
                  const summary = typeof s.result.summary === "string" ? s.result.summary : null
                  if (!summary) return null
                  return (
                    <p key={s.id} className="text-sm leading-relaxed text-pretty text-muted-foreground">
                      {summary}
                    </p>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {access.canViewCourtDates && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="size-4" />
                  Important Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {c.courtDate && (
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-sm font-medium">Next court date</span>
                    <span className="text-sm">{formatDate(c.courtDate)}</span>
                  </div>
                )}
                {courtDates.length === 0 && !c.courtDate ? (
                  <p className="text-sm text-muted-foreground">No dates scheduled yet.</p>
                ) : (
                  courtDates.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
                    >
                      <span className="flex items-center gap-2 text-sm">
                        {d.completed ? (
                          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Circle className="size-4 text-muted-foreground" />
                        )}
                        {d.label}
                      </span>
                      <span className="text-sm text-muted-foreground">{formatDate(d.dueDate)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {access.canViewEvidence && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Shared Evidence</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {sharedEvidence.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing shared with you yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {sharedEvidence.map((e) => (
                      <li key={e.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
                        <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          {e.link ? (
                            <a
                              href={e.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              {e.title}
                            </a>
                          ) : (
                            <p className="text-sm font-medium">{e.title}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {labelOf(INTAKE_EVIDENCE_TYPES, e.evidenceType)}
                          </p>
                          {e.summary && (
                            <p className="mt-1 text-xs text-muted-foreground text-pretty">{e.summary}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {access.canAddEvidence && <CaseEvidenceEditor caseId={c.id} />}
              </CardContent>
            </Card>
          )}

          {access.canViewDrafts && sharedDrafts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4" />
                  Shared Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {sharedDrafts.map((d) => (
                  <details key={d.id} className="rounded-lg border border-border p-3">
                    <summary className="cursor-pointer text-sm font-medium">{d.title}</summary>
                    <p className="mt-2 text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
                      {d.content}
                    </p>
                  </details>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          {access.canSendMessages ? (
            <Card className="lg:sticky lg:top-20">
              <CardHeader>
                <CardTitle className="text-base">Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <MessageThread messages={messages} caseId={c.id} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Secure messaging is not enabled for this case.
              </CardContent>
            </Card>
          )}

          {c.status === "closed" ? (
            <Card>
              <CardContent className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                This case has been closed{c.closedAt ? ` on ${formatDate(c.closedAt)}` : ""}.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Manage Case</CardTitle>
              </CardHeader>
              <CardContent>
                <CloseCaseRequest
                  caseId={c.id}
                  status={c.status}
                  closureRequested={c.closureRequested}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
