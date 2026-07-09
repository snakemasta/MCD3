import Link from "next/link"
import { requireLawEnforcement } from "@/lib/session"
import { listWarrants, getWarrantFilterOptions } from "@/lib/warrants"
import { getSettings } from "@/lib/settings"
import { WARRANT_TYPES } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { WarrantList, type WarrantListItem } from "@/components/warrants/warrant-list"
import { Plus } from "lucide-react"

export default async function LEWarrantsPage() {
  const user = await requireLawEnforcement()
  const [rows, filterOptions, settings] = await Promise.all([
    listWarrants({ scopeOfficerId: user.id }),
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

  const typeOptions = [...WARRANT_TYPES, ...settings.customTypes]

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">My Warrants</h1>
          <p className="text-muted-foreground">Track warrant requests you have submitted for judicial review.</p>
        </div>
        <Button render={<Link href="/le/warrant/new" />}>
          <Plus className="size-4" />
          Request Warrant
        </Button>
      </div>

      <WarrantList
        warrants={warrants}
        filterOptions={filterOptions}
        typeOptions={typeOptions}
        statusLabels={settings.statusLabels}
        basePath="/le/warrant"
      />
    </main>
  )
}
