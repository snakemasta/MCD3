import { requireJudge } from "@/lib/session"
import { listWarrants, getWarrantFilterOptions } from "@/lib/warrants"
import { getSettings } from "@/lib/settings"
import { WARRANT_TYPES } from "@/lib/constants"
import { WarrantList, type WarrantListItem } from "@/components/warrants/warrant-list"

export default async function JudgeAllWarrantsPage() {
  await requireJudge()
  const [rows, filterOptions, settings] = await Promise.all([
    listWarrants(),
    getWarrantFilterOptions(),
    getSettings("warrant"),
  ])

  const warrants: WarrantListItem[] = rows.map((w) => ({
    id: w.id,
    warrantNumber: w.warrantNumber,
    title: w.title,
    warrantType: w.warrantType,
    suspectName: w.suspectName,
    requestingOfficerName: w.requestingOfficerName,
    agency: w.agency,
    status: w.status,
    judgeName: w.judgeName,
    createdAt: w.createdAt.toISOString(),
    decidedAt: w.decidedAt ? w.decidedAt.toISOString() : null,
    linkedProsecutionCaseId: w.linkedProsecutionCaseId,
    linkedDefenseCaseId: w.linkedDefenseCaseId,
  }))

  return (
    <main className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">All Warrants</h1>
        <p className="text-muted-foreground">Every warrant request across all statuses.</p>
      </div>
      <WarrantList
        warrants={warrants}
        filterOptions={filterOptions}
        typeOptions={[...WARRANT_TYPES, ...settings.customTypes]}
        statusLabels={settings.statusLabels}
        basePath="/judge/warrant"
      />
    </main>
  )
}
