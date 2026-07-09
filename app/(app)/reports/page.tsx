import Link from "next/link"
import { FileText } from "lucide-react"
import { requireStaffPermission } from "@/lib/session"
import { listPoliceReports } from "@/app/actions/police-reports"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  needs_info: "bg-orange-100 text-orange-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  converted: "bg-purple-100 text-purple-800",
}

export default async function PoliceReportsPage() {
  await requireStaffPermission("report:view-all")
  const reports = await listPoliceReports()

  return (
    <main className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Police Reports</h1>
        <p className="text-muted-foreground">
          Review incident reports filed by law enforcement and add them to a
          case evidence locker.
        </p>
      </div>

      {reports.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No police reports</EmptyTitle>
            <EmptyDescription>
              Incident reports submitted by law enforcement will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3">
          {reports.map((r) => (
            <Link key={r.id} href={`/reports/${r.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{r.title}</p>
                      <Badge variant="outline" className="shrink-0 capitalize">
                        {r.priority}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {r.reportNumber}
                      {r.officerName ? ` · ${r.officerName}` : ""}
                      {r.agency ? ` · ${r.agency}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge
                      className={
                        STATUS_COLORS[r.status] || "bg-gray-100 text-gray-800"
                      }
                    >
                      {r.status.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {r.incidentDate
                        ? new Date(r.incidentDate).toLocaleDateString()
                        : new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
