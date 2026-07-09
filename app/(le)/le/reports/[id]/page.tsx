import Link from "next/link"
import { requireLawEnforcement } from "@/lib/session"
import { db } from "@/lib/db"
import { leReports, leReportLinks, leReportWitnesses } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ExternalLink } from "lucide-react"

export default async function LEReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireLawEnforcement()
  const { id } = await params

  const reports = await db.select().from(leReports).where(eq(leReports.id, id))
  if (!reports.length || reports[0].officerId !== user.id) {
    notFound()
  }
  const report = reports[0]

  const links = await db.select().from(leReportLinks).where(eq(leReportLinks.reportId, id))
  const witnesses = await db
    .select()
    .from(leReportWitnesses)
    .where(eq(leReportWitnesses.reportId, id))

  const statusColors: Record<string, string> = {
    submitted: "bg-blue-100 text-blue-800",
    under_review: "bg-yellow-100 text-yellow-800",
    needs_info: "bg-orange-100 text-orange-800",
    accepted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    converted: "bg-purple-100 text-purple-800",
  }

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button render={<Link href="/le/reports" />} variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">{report.title}</h1>
      </div>

      <div className="grid gap-6">
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Report Number</p>
              <p className="font-semibold text-lg">{report.reportNumber}</p>
            </div>
            <Badge className={statusColors[report.status] || "bg-gray-100 text-gray-800"}>
              {report.status.replace(/_/g, " ")}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Incident Type</p>
              <p className="font-medium">{report.incidentType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Priority</p>
              <p className="font-medium capitalize">{report.priority}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Incident Date</p>
              <p className="font-medium">{report.incidentDate ? new Date(report.incidentDate).toLocaleDateString() : "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">{report.incidentLocation || "—"}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4">Suspect Information</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{report.suspectName || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="font-medium">{report.suspectDescription || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Proposed Charges</p>
              <p className="font-medium">{report.proposedCharges || "Not specified"}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4">Incident Narrative</h2>
          <p className="whitespace-pre-wrap text-sm">{report.narrative}</p>
        </Card>

        {report.probableCause && (
          <Card className="p-6">
            <h2 className="font-semibold text-lg mb-4">Probable Cause</h2>
            <p className="whitespace-pre-wrap text-sm">{report.probableCause}</p>
          </Card>
        )}

        {links.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-lg mb-4">Evidence & Documents ({links.length})</h2>
            <div className="space-y-2">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded border hover:bg-muted transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{link.label}</p>
                    <p className="text-xs text-muted-foreground">{link.kind}</p>
                  </div>
                </a>
              ))}
            </div>
          </Card>
        )}

        {witnesses.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-lg mb-4">Witnesses ({witnesses.length})</h2>
            <div className="space-y-4">
              {witnesses.map((w) => (
                <div key={w.id} className="border-b pb-4 last:border-0">
                  <p className="font-medium">{w.name}</p>
                  {w.contact && <p className="text-sm text-muted-foreground">{w.contact}</p>}
                  {w.statement && <p className="text-sm mt-2 italic">{w.statement}</p>}
                </div>
              ))}
            </div>
          </Card>
        )}

        {report.infoRequest && (
          <Card className="p-6 border-orange-200 bg-orange-50">
            <h2 className="font-semibold text-lg mb-2">Prosecution Information Request</h2>
            <p className="text-sm text-orange-900 whitespace-pre-wrap">{report.infoRequest}</p>
          </Card>
        )}

        {report.reviewNotes && (
          <Card className="p-6 border-blue-200 bg-blue-50">
            <h2 className="font-semibold text-lg mb-2">Prosecutor&apos;s Review Notes</h2>
            <p className="text-sm text-blue-900 whitespace-pre-wrap">{report.reviewNotes}</p>
          </Card>
        )}
      </div>
    </main>
  )
}
