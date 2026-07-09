import Link from "next/link"
import {
  FileText,
  MapPin,
  Package,
  Building2,
  User,
  Calendar,
  ShieldAlert,
  Link2,
  Briefcase,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { WarrantStatusBadge } from "@/components/warrants/warrant-status-badge"
import type { WarrantRow, WarrantHistoryRow, WarrantCloseoutRow } from "@/lib/warrants"
import { warrantTypeLabel, riskLevelLabel, warrantStatusLabel, type EvidenceLink } from "@/lib/warrant-utils"

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  severe: "bg-red-100 text-red-800",
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

export function WarrantDetailView({
  warrant,
  history,
  closeout,
  statusLabels = {},
  typeOptions = [],
}: {
  warrant: WarrantRow
  history: WarrantHistoryRow[]
  closeout: WarrantCloseoutRow | null
  statusLabels?: Record<string, string>
  typeOptions?: { value: string; label: string }[]
}) {
  const links = (Array.isArray(warrant.evidenceLinks) ? warrant.evidenceLinks : []) as EvidenceLink[]
  const closeoutLinks = (closeout && Array.isArray(closeout.evidenceLinks) ? closeout.evidenceLinks : []) as EvidenceLink[]

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{warrant.title}</h2>
              <WarrantStatusBadge status={warrant.status} labels={statusLabels} />
              <Badge className={`${RISK_COLORS[warrant.riskLevel] ?? "bg-muted text-muted-foreground"} border-transparent`}>
                {riskLevelLabel(warrant.riskLevel)} risk
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {warrant.warrantNumber} · {warrantTypeLabel(warrant.warrantType, typeOptions)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail icon={User} label="Suspect / Defendant" value={warrant.suspectName} />
          <Detail icon={Calendar} label="Date of birth" value={warrant.dateOfBirth} />
          <Detail icon={Building2} label="Agency" value={warrant.agency} />
          <Detail icon={User} label="Requesting officer" value={warrant.requestingOfficerName} />
          <Detail icon={ShieldAlert} label="Requested charges" value={warrant.requestedCharges} />
          <Detail
            icon={Calendar}
            label="Incident date"
            value={warrant.incidentDate ? new Date(warrant.incidentDate).toLocaleString() : null}
          />
          <Detail icon={MapPin} label="Location" value={warrant.location} />
          <Detail icon={Package} label="Items / persons sought" value={warrant.itemsSought} />
          <Detail icon={User} label="Reviewing judge" value={warrant.judgeName} />
        </div>
      </Card>

      <Card className="space-y-5 p-6">
        <Prose title="Probable Cause" body={warrant.probableCause} />
        <Prose title="Incident Summary" body={warrant.incidentSummary} />
        <Prose title="Items / Persons Sought" body={warrant.itemsSought} />
        <Prose title="Evidence Summaries" body={warrant.evidenceSummaries} />
        <Prose title="Notes to Judge" body={warrant.notesToJudge} />

        {links.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold">Evidence Links</h3>
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

      {(warrant.linkedProsecutionCaseId || warrant.linkedDefenseCaseId) && (
        <Card className="p-6">
          <h3 className="text-sm font-semibold">Linked Cases</h3>
          <div className="mt-2 flex flex-wrap gap-3">
            {warrant.linkedProsecutionCaseId && (
              <Link
                href={`/prosecution/cases/${warrant.linkedProsecutionCaseId}`}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
              >
                <Briefcase className="size-4 text-primary" />
                Prosecution case
              </Link>
            )}
            {warrant.linkedDefenseCaseId && (
              <Link
                href={`/cases/${warrant.linkedDefenseCaseId}`}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
              >
                <Briefcase className="size-4 text-primary" />
                Defense case
              </Link>
            )}
          </div>
        </Card>
      )}

      {warrant.denyReason && (
        <Card className="border-destructive/30 bg-destructive/5 p-6">
          <h3 className="text-sm font-semibold text-destructive">Denial Reason</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm">{warrant.denyReason}</p>
        </Card>
      )}

      {closeout && (
        <Card className="p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="size-4" />
            Closeout Record
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail icon={Calendar} label="Served" value={closeout.served ? "Yes" : "No"} />
            <Detail
              icon={Calendar}
              label="Served at"
              value={closeout.servedAt ? new Date(closeout.servedAt).toLocaleString() : null}
            />
            <Detail icon={MapPin} label="Arrest location" value={closeout.arrestLocation} />
            <Detail icon={User} label="Arresting officer" value={closeout.arrestingOfficer} />
            <Detail icon={User} label="Defendant arrested" value={closeout.defendantArrested ? "Yes" : "No"} />
            <Detail icon={Package} label="Evidence recovered" value={closeout.evidenceRecovered ? "Yes" : "No"} />
            <Detail icon={ShieldAlert} label="Defendant contested" value={closeout.defendantContested ? "Yes" : "No"} />
            <Detail icon={ShieldAlert} label="Force used" value={closeout.forceUsed ? "Yes" : "No"} />
            <Detail icon={ShieldAlert} label="Additional charges" value={closeout.additionalCharges ? "Yes" : "No"} />
          </div>
          {closeout.closingNotes && <Prose title="Closing Notes" body={closeout.closingNotes} />}
          {closeoutLinks.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {closeoutLinks.map((l, i) => (
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
                    <span className="font-medium">{warrantStatusLabel(h.toStatus, statusLabels)}</span>
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
