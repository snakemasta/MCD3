import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Link2, FolderOpen } from "lucide-react"
import { requireCivilian } from "@/lib/session"
import { getCivilianIntakeDetail, getIntakeMessages } from "@/lib/portal"
import { getSettings } from "@/lib/settings"
import { resolveAllFields, statusLabel, urgencyLabel } from "@/lib/intake-config"
import { INTAKE_TYPES, INTAKE_EVIDENCE_TYPES, labelOf } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IntakeStatusBadge, UrgencyBadge } from "@/components/portal/intake-status-badge"
import { MessageThread } from "@/components/portal/message-thread"
import { IntakeEvidenceEditor } from "@/components/portal/intake-evidence-editor"

const EDITABLE = ["new", "under_review", "needs_info"]

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const me = await requireCivilian()
  const detail = await getCivilianIntakeDetail(me.id, id)
  if (!detail) notFound()

  const settings = await getSettings("civilian")
  const messages = await getIntakeMessages(id, me.id)
  const { intake } = detail

  const fields = resolveAllFields(intake.type, settings).filter(
    (f) => f.key !== "fullName" && f.key !== "email" && f.key !== "phone",
  )
  const answers = fields
    .map((f) => ({ label: f.label, value: (intake.data?.[f.key] as string) ?? "" }))
    .filter((a) => a.value)

  const editable = EDITABLE.includes(intake.status)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/portal/requests"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All requests
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-balance">
              {intake.subject || labelOf(INTAKE_TYPES, intake.type)}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {labelOf(INTAKE_TYPES, intake.type)} · Submitted {formatDate(intake.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <UrgencyBadge urgency={intake.urgency} label={urgencyLabel(settings, intake.urgency)} />
            <IntakeStatusBadge status={intake.status} label={statusLabel(settings, intake.status)} />
          </div>
        </div>
      </div>

      {intake.status === "needs_info" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Our team needs a little more information. Please add details or evidence below, or
          reply in the messages, and we&apos;ll continue your review.
        </div>
      )}

      {intake.linkedCaseId && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300">
            <FolderOpen className="size-4" />
            Good news — this request is now an active case.
          </div>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/portal/cases/${intake.linkedCaseId}`} />}
          >
            View Case
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What You Told Us</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {answers.map((a) => (
                <div key={a.label} className="grid gap-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{a.label}</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{a.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evidence</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {intake.evidence.length === 0 ? (
                <p className="text-sm text-muted-foreground">No evidence attached yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {intake.evidence.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-start gap-2 rounded-lg border border-border p-3"
                    >
                      <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-sm font-medium text-primary hover:underline"
                        >
                          {e.title}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {labelOf(INTAKE_EVIDENCE_TYPES, e.type)}
                        </p>
                        {e.summary && (
                          <p className="mt-1 text-xs text-muted-foreground text-pretty">
                            {e.summary}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {editable && <IntakeEvidenceEditor intakeId={intake.id} />}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle className="text-base">Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <MessageThread messages={messages} intakeId={intake.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
