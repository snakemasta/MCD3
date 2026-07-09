import Link from "next/link"
import {
  Scale,
  User,
  Calendar,
  Gavel,
  Link2,
  Briefcase,
  Flag,
  MessageSquare,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MotionStatusBadge } from "@/components/motions/motion-status-badge"
import type { MotionRow, MotionHistoryRow } from "@/lib/motions"
import {
  motionTypeLabel,
  motionSideLabel,
  motionUrgencyLabel,
  motionStatusLabel,
  type EvidenceLink,
} from "@/lib/motion-utils"

const URGENCY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  normal: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  emergency: "bg-red-100 text-red-800",
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  )
}

function Prose({ title, body }: { title: string; body: string | null }) {
  if (!body) return null
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{body}</p>
    </div>
  )
}

export function MotionDetailView({
  motion,
  history,
  caseLabel,
  caseHref,
  statusLabels = {},
  typeOptions = [],
}: {
  motion: MotionRow
  history: MotionHistoryRow[]
  caseLabel?: string | null
  caseHref?: string | null
  statusLabels?: Record<string, string>
  typeOptions?: { value: string; label: string }[]
}) {
  const links = (Array.isArray(motion.evidenceLinks) ? motion.evidenceLinks : []) as EvidenceLink[]

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{motion.title}</h2>
              <MotionStatusBadge status={motion.status} labels={statusLabels} />
              <Badge
                className={`${URGENCY_COLORS[motion.urgency] ?? "bg-muted text-muted-foreground"} border-transparent`}
              >
                {motionUrgencyLabel(motion.urgency)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {motion.motionNumber} · {motionTypeLabel(motion.motionType, typeOptions)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail icon={Flag} label="Filed by" value={`${motionSideLabel(motion.filingSide)} · ${motion.filedByName ?? "—"}`} />
          <Detail icon={Scale} label="Type" value={motionTypeLabel(motion.motionType, typeOptions)} />
          <Detail icon={MessageSquare} label="Hearing requested" value={motion.hearingRequested ? "Yes" : "No"} />
          <Detail icon={User} label="Deciding judge" value={motion.judgeName} />
          <Detail
            icon={Calendar}
            label="Filed"
            value={motion.createdAt ? new Date(motion.createdAt).toLocaleDateString() : null}
          />
          <Detail
            icon={Calendar}
            label="Decided"
            value={motion.decidedAt ? new Date(motion.decidedAt).toLocaleDateString() : null}
          />
        </div>
      </Card>

      <Card className="space-y-5 p-6">
        <Prose title="Relief Requested" body={motion.relief} />
        <Prose title="Legal Argument" body={motion.argument} />
        <Prose title="Factual Basis" body={motion.factualBasis} />
        <Prose title="Authorities Cited" body={motion.authoritiesCited} />

        {links.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold">Supporting Exhibits</h3>
            <ul className="mt-2 space-y-1.5">
              {links.map((l, i) => (
                <li key={i}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Link2 className="size-3.5" />
                    {l.label || l.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {caseLabel && (
        <Card className="p-6">
          <h3 className="text-sm font-semibold">Case</h3>
          <div className="mt-2">
            {caseHref ? (
              <Link
                href={caseHref}
                className="flex w-fit items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
              >
                <Briefcase className="size-4 text-primary" />
                {caseLabel}
              </Link>
            ) : (
              <p className="flex items-center gap-2 text-sm">
                <Briefcase className="size-4 text-primary" />
                {caseLabel}
              </p>
            )}
          </div>
        </Card>
      )}

      {motion.opposingResponse && (
        <Card className="p-6">
          <Prose title="Opposing Party Response" body={motion.opposingResponse} />
        </Card>
      )}

      {(motion.infoRequest || motion.infoResponse) && (
        <Card className="border-orange-200 bg-orange-50/60 p-6 dark:bg-orange-950/10">
          <Prose title="Court's Request for Information" body={motion.infoRequest} />
          {motion.infoResponse && <div className="mt-4" />}
          <Prose title="Movant's Response" body={motion.infoResponse} />
        </Card>
      )}

      {motion.ruling && (
        <Card className="border-primary/30 bg-primary/5 p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Gavel className="size-4 text-primary" />
            Court Ruling — {motionStatusLabel(motion.status, statusLabels)}
          </h3>
          {motion.rulingSummary && (
            <p className="mt-2 text-sm font-medium">{motion.rulingSummary}</p>
          )}
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{motion.ruling}</p>
          {motion.judgeName && (
            <p className="mt-2 text-xs text-muted-foreground">Entered by {motion.judgeName}</p>
          )}
        </Card>
      )}

      {history.length > 0 && (
        <Card className="p-6">
          <h3 className="text-sm font-semibold">History</h3>
          <ol className="mt-3 space-y-3">
            {history.map((h) => (
              <li key={h.id} className="flex gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{motionStatusLabel(h.toStatus, statusLabels)}</span>
                    {h.actorName && <span className="text-muted-foreground"> · {h.actorName}</span>}
                  </p>
                  {h.notes && <p className="text-sm text-muted-foreground">{h.notes}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  )
}
