import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { requireLawEnforcement } from "@/lib/session"
import { db } from "@/lib/db"
import { leReports } from "@/lib/db/schema"
import { getWarrant } from "@/lib/warrants"
import { getSettings } from "@/lib/settings"
import { WARRANT_TYPES, WARRANT_RISK_LEVELS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { WarrantForm } from "@/components/warrants/warrant-form"
import { ArrowLeft } from "lucide-react"
import type { EvidenceLink } from "@/lib/warrant-utils"

export default async function EditWarrantPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireLawEnforcement()
  const warrant = await getWarrant(id)
  if (!warrant) notFound()
  if (warrant.requestingOfficerId !== user.id && user.role !== "admin") notFound()
  if (!["draft", "needs_more_info"].includes(warrant.status)) redirect(`/le/warrant/${id}`)

  const [reports, settings] = await Promise.all([
    db.select().from(leReports).where(eq(leReports.officerId, user.id)),
    getSettings("warrant"),
  ])

  // Format incident date for datetime-local input.
  const incidentLocal = warrant.incidentDate
    ? new Date(warrant.incidentDate).toISOString().slice(0, 16)
    : ""

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Button render={<Link href={`/le/warrant/${id}`} />} variant="ghost" size="sm">
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-3xl font-bold">Edit Warrant</h1>
      </div>

      <WarrantForm
        mode="edit"
        initial={{
          id: warrant.id,
          title: warrant.title,
          warrantType: warrant.warrantType,
          suspectName: warrant.suspectName ?? "",
          dateOfBirth: warrant.dateOfBirth ?? "",
          agency: warrant.agency ?? "",
          requestedCharges: warrant.requestedCharges ?? "",
          probableCause: warrant.probableCause ?? "",
          incidentSummary: warrant.incidentSummary ?? "",
          incidentDate: incidentLocal,
          location: warrant.location ?? "",
          itemsSought: warrant.itemsSought ?? "",
          riskLevel: warrant.riskLevel,
          evidenceLinks: (Array.isArray(warrant.evidenceLinks) ? warrant.evidenceLinks : []) as EvidenceLink[],
          evidenceSummaries: warrant.evidenceSummaries ?? "",
          relatedPoliceReportId: warrant.relatedPoliceReportId,
          notesToJudge: warrant.notesToJudge ?? "",
        }}
        warrantTypes={[...WARRANT_TYPES, ...settings.customTypes]}
        riskLevels={[...WARRANT_RISK_LEVELS]}
        policeReports={reports.map((r) => ({ id: r.id, label: `#${r.reportNumber} — ${r.title}` }))}
        officerName={user.name}
      />
    </main>
  )
}
