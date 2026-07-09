"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { leReports, leReportLinks, leReportWitnesses } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ExternalLink } from "lucide-react"

export default function ProsecutionReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [report, setReport] = useState<any>(null)
  const [links, setLinks] = useState<any[]>([])
  const [witnesses, setWitnesses] = useState<any[]>([])

  // Fetch report data using suspense boundary or standard fetch
  const [loadingReport, setLoadingReport] = useState(true)

  const { id } = params as any

  async function fetchReport() {
    try {
      const res = await fetch(`/api/le-reports/${id}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setReport(data)
      setLinks(data.links || [])
      setWitnesses(data.witnesses || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingReport(false)
    }
  }

  if (loadingReport && !report) {
    fetchReport()
  }

  async function handleAction(action: string) {
    if (!report) return
    setActionLoading(action)
    try {
      const res = await fetch("/api/prosecution/review-queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          action,
          notes,
        }),
      })

      if (!res.ok) throw new Error(await res.text())

      const updated = await res.json()
      setReport(updated)
      setNotes("")
      console.log("[v0] Report action completed:", action)

      if (action === "convert") {
        // Proceed to convert to case
        const convertRes = await fetch("/api/prosecution/convert-case", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId: report.id }),
        })
        if (!convertRes.ok) throw new Error(await convertRes.text())
        const { case: newCase } = await convertRes.json()
        router.push(`/prosecution/cases/${newCase.id}`)
      } else {
        router.push("/prosecution/review")
      }
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : "Action failed")
    } finally {
      setActionLoading(null)
    }
  }

  if (loadingReport) {
    return <main className="flex-1 p-6">Loading...</main>
  }

  if (!report) {
    return (
      <main className="flex-1 p-6">
        <p className="text-red-600">Report not found</p>
      </main>
    )
  }

  const statusColors: Record<string, string> = {
    submitted: "bg-blue-100 text-blue-800",
    under_review: "bg-yellow-100 text-yellow-800",
    needs_info: "bg-orange-100 text-orange-800",
    accepted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  }

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button render={<Link href="/prosecution/review" />} variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">{report.title}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Report #</p>
                <p className="font-semibold text-lg">{report.reportNumber}</p>
              </div>
              <Badge className={statusColors[report.status] || "bg-gray-100 text-gray-800"}>
                {report.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold mb-3">Incident Details</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium">{report.incidentType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date & Location</p>
                <p className="font-medium">
                  {report.incidentDate ? new Date(report.incidentDate).toLocaleString() : "Unknown"} -{" "}
                  {report.incidentLocation || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Suspect</p>
                <p className="font-medium">{report.suspectName || "Unknown"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Proposed Charges</p>
                <p className="font-medium">{report.proposedCharges || "Not specified"}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold mb-3">Narrative</h2>
            <p className="whitespace-pre-wrap text-sm">{report.narrative}</p>
          </Card>

          {report.probableCause && (
            <Card className="p-6">
              <h2 className="font-semibold mb-3">Probable Cause</h2>
              <p className="whitespace-pre-wrap text-sm">{report.probableCause}</p>
            </Card>
          )}

          {links.length > 0 && (
            <Card className="p-6">
              <h2 className="font-semibold mb-3">Evidence ({links.length})</h2>
              <div className="space-y-2">
                {links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded border hover:bg-muted transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {link.label}
                  </a>
                ))}
              </div>
            </Card>
          )}

          {witnesses.length > 0 && (
            <Card className="p-6">
              <h2 className="font-semibold mb-3">Witnesses ({witnesses.length})</h2>
              <div className="space-y-3 text-sm">
                {witnesses.map((w) => (
                  <div key={w.id} className="border-b pb-2 last:border-0">
                    <p className="font-medium">{w.name}</p>
                    {w.contact && <p className="text-muted-foreground">{w.contact}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Prosecutor Actions</h2>
            <div className="space-y-2">
              <Button
                onClick={() => handleAction("accept")}
                disabled={actionLoading !== null}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {actionLoading === "accept" ? "Processing..." : "Accept Report"}
              </Button>
              <Button
                onClick={() => handleAction("request-info")}
                disabled={actionLoading !== null || !notes}
                variant="outline"
                className="w-full"
              >
                {actionLoading === "request-info" ? "Processing..." : "Request Info"}
              </Button>
              <Button
                onClick={() => handleAction("reject")}
                disabled={actionLoading !== null}
                variant="destructive"
                className="w-full"
              >
                {actionLoading === "reject" ? "Processing..." : "Reject Report"}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold mb-3">Review Notes</h2>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes for this report (required for Request Info or Reject)"
              className="min-h-24 text-sm"
            />
          </Card>

          {report.status === "accepted" && (
            <Card className="p-6 bg-green-50 border-green-200">
              <h2 className="font-semibold mb-3 text-green-900">Next Steps</h2>
              <Button
                onClick={() => handleAction("convert")}
                disabled={actionLoading !== null}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {actionLoading === "convert" ? "Converting..." : "Convert to Prosecution Case"}
              </Button>
              <p className="text-xs text-green-800 mt-2">
                This will create a new prosecution case with charges automatically populated.
              </p>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}
