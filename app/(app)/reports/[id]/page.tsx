import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { requireStaffPermission } from "@/lib/session"
import {
  getPoliceReport,
  getCasesWithReport,
  listCasesForEvidence,
} from "@/app/actions/police-reports"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AddReportToCase } from "@/components/reports/add-report-to-case"

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  needs_info: "bg-orange-100 text-orange-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  converted: "bg-purple-100 text-purple-800",
}

export default async function StaffReportViewerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const current = await requireStaffPermission("report:view-all")
  const { id } = await params

  const data = await getPoliceReport(id)
  if (!data) notFound()
  const { report, links, witnesses } = data

  const canAdd = current.permissions.includes("evidence:add-report")
  const [caseOptions, casesWithReport] = canAdd
    ? await Promise.all([listCasesForEvidence(), getCasesWithReport(id)])
    : [[], []]

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button render={<Link href="/reports" />} variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-3xl font-bold text-balance">{report.title}</h1>
        </div>
        {canAdd && (
          <AddReportToCase
            reportId={report.id}
            reportTitle={report.title}
            cases={caseOptions}
            alreadyAddedCaseIds={casesWithReport}
          />
        )}
      </div>

      <div className="grid gap-6">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Report Number</p>
              <p className="text-lg font-semibold">{report.reportNumber}</p>
            </div>
            <Badge
              className={
                STATUS_COLORS[report.status] || "bg-gray-100 text-gray-800"
              }
            >
              {report.status.replace(/_/g, " ")}
            </Badge>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6 border-t pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Incident Type</p>
              <p className="font-medium capitalize">{report.incidentType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Priority</p>
              <p className="font-medium capitalize">{report.priority}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Incident Date</p>
              <p className="font-medium">
                {report.incidentDate
                  ? new Date(report.incidentDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">{report.incidentLocation || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Agency</p>
              <p className="font-medium">{report.agency || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Filing Officer</p>
              <p className="font-medium">
                {report.officerName || "—"}
                {report.badgeNumber ? ` (#${report.badgeNumber})` : ""}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Suspect Information</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">
                {report.suspectName || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="font-medium">
                {report.suspectDescription || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Proposed Charges</p>
              <p className="font-medium">
                {report.proposedCharges || "Not specified"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Incident Narrative</h2>
          <p className="whitespace-pre-wrap text-sm">{report.narrative}</p>
        </Card>

        {report.probableCause && (
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Probable Cause</h2>
            <p className="whitespace-pre-wrap text-sm">
              {report.probableCause}
            </p>
          </Card>
        )}

        {links.length > 0 && (
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Evidence &amp; Documents ({links.length})
            </h2>
            <div className="space-y-2">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded border p-3 transition-colors hover:bg-muted"
                >
                  <ExternalLink className="size-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{link.label}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {link.kind}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </Card>
        )}

        {witnesses.length > 0 && (
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Witnesses ({witnesses.length})
            </h2>
            <div className="space-y-4">
              {witnesses.map((w) => (
                <div key={w.id} className="border-b pb-4 last:border-0">
                  <p className="font-medium">{w.name}</p>
                  {w.contact && (
                    <p className="text-sm text-muted-foreground">{w.contact}</p>
                  )}
                  {w.statement && (
                    <p className="mt-2 text-sm italic">{w.statement}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </main>
  )
}
