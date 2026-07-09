import Link from "next/link"
import { requireProsecution } from "@/lib/session"
import { db } from "@/lib/db"
import { leReports } from "@/lib/db/schema"
import { inArray } from "drizzle-orm"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"

export default async function ReviewQueuePage() {
  const user = await requireProsecution()

  // Fetch reports that need review
  const reports = await db
    .select()
    .from(leReports)
    .where(inArray(leReports.status, ["submitted", "needs_info"]))

  const statusColors: Record<string, string> = {
    submitted: "bg-blue-100 text-blue-800",
    needs_info: "bg-orange-100 text-orange-800",
  }

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button render={<Link href="/prosecution" />} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Review Queue</h1>
            <p className="text-muted-foreground mt-1">Incident reports awaiting prosecution review</p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {reports.length} Pending
        </Badge>
      </div>

      {reports.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No reports awaiting review.</p>
          <Button render={<Link href="/prosecution" />} variant="outline">
            Return to Dashboard
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="p-6 hover:bg-muted/50 transition-colors">
              <Link href={`/prosecution/review/${report.id}`} className="block">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{report.title}</h3>
                    <p className="text-sm text-muted-foreground">Report #{report.reportNumber}</p>
                  </div>
                  <Badge className={statusColors[report.status] || "bg-gray-100 text-gray-800"}>
                    {report.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">{report.incidentType}</p>
                    <p>Type</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{report.suspectName || "Unknown"}</p>
                    <p>Suspect</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{report.officerName || "Unknown"}</p>
                    <p>Officer</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "—"}
                    </p>
                    <p>Submitted</p>
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
