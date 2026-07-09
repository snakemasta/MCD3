import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Mail, Phone, FileText } from "lucide-react"
import { requireStaffPermission } from "@/lib/session"
import { getIntakeDetail } from "@/lib/intake"
import { listTeam } from "@/app/actions/team"
import { getSettings } from "@/lib/settings"
import { selectableStatuses, statusLabel } from "@/lib/intake-config"
import {
  intakeFieldsForType,
  labelOf,
  INTAKE_TYPES,
  INTAKE_URGENCY_LEVELS,
  INTAKE_EVIDENCE_TYPES,
  CASE_TYPES,
  CASE_PRIORITIES,
} from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IntakeStatusBadge } from "@/components/portal/intake-status-badge"
import { IntakeReviewPanel } from "@/components/intake/intake-review-panel"
import { IntakeNotesPanel } from "@/components/intake/intake-notes-panel"
import { ConvertIntakeDialog } from "@/components/intake/convert-intake-dialog"
import { MessageThread } from "@/components/portal/message-thread"
import { sendStaffIntakeMessage } from "@/app/actions/intake"

export default async function IntakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const current = await requireStaffPermission("intake:review")
  const detail = await getIntakeDetail(id)
  if (!detail) notFound()

  const { intake, notes, messages } = detail
  const [team, settings] = await Promise.all([listTeam(), getSettings("civilian")])

  const reviewerRoles = settings.reviewerRoles
  const reviewers = team
    .filter((m) => reviewerRoles.includes(m.role))
    .map((m) => ({ id: m.userId, name: m.name, role: m.role }))

  const statusOptions = selectableStatuses(settings)
  const fields = intakeFieldsForType(intake.type).filter(
    (f) => !["fullName", "email", "phone"].includes(f.key),
  )

  const canConvert = current.permissions.includes("intake:convert")
  const canUseAi = current.permissions.includes("ai:use")
  const isLinked = Boolean(intake.linkedCaseId)

  // Suggested defaults for conversion, informed by AI review if present.
  const suggestedType =
    intake.aiReview?.caseType && CASE_TYPES.some((t) => t.value === intake.aiReview?.caseType)
      ? intake.aiReview.caseType
      : intake.type === "criminal"
        ? "criminal"
        : "civil"
  const suggestedPriority =
    intake.aiReview?.suggestedPriority &&
    CASE_PRIORITIES.some((p) => p.value === intake.aiReview?.suggestedPriority)
      ? intake.aiReview.suggestedPriority
      : intake.urgency === "urgent" || intake.urgency === "high"
        ? "high"
        : "normal"

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          nativeButton={false}
          render={
            <Link href="/intake">
              <ArrowLeft className="size-4" data-icon />
              Back to Intake Queue
            </Link>
          }
        />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{labelOf(INTAKE_TYPES, intake.type)}</Badge>
              <IntakeStatusBadge status={intake.status} label={statusLabel(settings, intake.status)} />
              {intake.urgency !== "normal" && (
                <Badge variant="secondary">{labelOf(INTAKE_URGENCY_LEVELS, intake.urgency)}</Badge>
              )}
            </div>
            <h1 className="text-pretty text-2xl font-semibold tracking-tight">
              {intake.subject || "Untitled Request"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Submitted {new Date(intake.createdAt).toLocaleDateString()}
            </p>
          </div>
          {canConvert && !isLinked && (
            <ConvertIntakeDialog
              intakeId={intake.id}
              defaultTitle={intake.subject || intake.fullName}
              defaultCaseType={suggestedType}
              defaultPriority={suggestedPriority}
              caseTypes={CASE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              priorities={CASE_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
              evidenceCount={intake.evidence.length}
            />
          )}
          {isLinked && (
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link href={`/cases/${intake.linkedCaseId}`}>
                  <FileText className="size-4" data-icon />
                  View Linked Case
                </Link>
              }
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Contact</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="font-medium">{intake.fullName}</div>
              <a
                href={`mailto:${intake.email}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Mail className="size-4" />
                {intake.email}
              </a>
              {intake.phone && (
                <a
                  href={`tel:${intake.phone}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Phone className="size-4" />
                  {intake.phone}
                </a>
              )}
            </CardContent>
          </Card>

          {/* Submitted answers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {fields.map((f) => {
                  const v = intake.data[f.key]
                  if (v == null || v === "") return null
                  const display =
                    f.options ? labelOf(f.options, String(v)) : String(v)
                  return (
                    <div key={f.key} className="flex flex-col gap-1">
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {f.label}
                      </dt>
                      <dd className="whitespace-pre-wrap text-sm leading-relaxed">{display}</dd>
                    </div>
                  )
                })}
              </dl>
            </CardContent>
          </Card>

          {/* Evidence */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Evidence & Links ({intake.evidence.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {intake.evidence.length === 0 ? (
                <p className="text-sm text-muted-foreground">No evidence submitted.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {intake.evidence.map((ev, i) => (
                    <li key={i} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{ev.title}</span>
                          <Badge variant="secondary" className="w-fit text-xs">
                            {labelOf(INTAKE_EVIDENCE_TYPES, ev.type)}
                          </Badge>
                          {ev.summary && (
                            <p className="mt-1 text-sm text-muted-foreground text-pretty">
                              {ev.summary}
                            </p>
                          )}
                        </div>
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex shrink-0 items-center gap-1 text-sm text-primary hover:underline"
                        >
                          Open <ExternalLink className="size-3.5" />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Internal notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <IntakeNotesPanel intakeId={intake.id} notes={notes} />
            </CardContent>
          </Card>

          {/* Client messages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <MessageThread
                messages={messages}
                currentUserId={current.id}
                canSend
                onSendAction={async (body: string) => {
                  "use server"
                  await sendStaffIntakeMessage(intake.id, body)
                }}
                emptyText="No messages with the client yet."
              />
            </CardContent>
          </Card>
        </div>

        {/* Review sidebar */}
        <div>
          <IntakeReviewPanel
            intakeId={intake.id}
            status={intake.status}
            reviewerId={intake.reviewerId}
            statusOptions={statusOptions}
            reviewers={reviewers}
            aiReview={intake.aiReview}
            canConvert={canConvert}
            canUseAi={canUseAi}
            isLinked={isLinked}
          />
        </div>
      </div>
    </div>
  )
}
