import Link from "next/link"
import { requireLawEnforcement } from "@/lib/session"
import { db } from "@/lib/db"
import { leReports } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"

export default async function LEReportsPage() {
  const user = await requireLawEnforcement()

  const reports = await db.select().from(leReports).where(eq(leReports.officerId, user.id))

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
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button render={<Link href="/le" />} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-3xl font-bold">My Reports</h1>
          </div>
          <p className="text-muted-foreground">View and manage all incident reports you&apos;ve submitted</p>
        </div>
        <Button render={<Link href="/le/report/new" />}>New Report</Button>
      </div>

      {reports.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No reports yet. Submit your first incident report.</p>
          <Button render={<Link href="/le/report/new" />}>Create Report</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="p-6 hover:bg-muted/50 transition-colors">
              <Link href={`/le/reports/${report.id}`} className="block">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{report.title}</h3>
                    <p className="text-sm text-muted-foreground">Report #{report.reportNumber}</p>
                  </div>
                  <Badge className={statusColors[report.status] || "bg-gray-100 text-gray-800"}>
                    {report.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">{report.incidentType}</p>
                    <p>Incident Type</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{report.suspectName || "Unknown"}</p>
                    <p>Suspect</p>
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
