import { requireUser } from "@/lib/session"
import { listCases } from "@/app/actions/cases"
import { CASE_TYPES } from "@/lib/constants"
import { PageHeader } from "@/components/page-header"
import { CaseDepot, type CaseDepotGroup } from "@/components/case-depot"

export default async function CaseDepotPage() {
  await requireUser()
  const closed = await listCases({ status: "closed" })

  // Group closed cases by their case type, in the canonical type order.
  const groups: CaseDepotGroup[] = CASE_TYPES.map((t) => ({
    type: t.value as string,
    label: t.label as string,
    cases: closed.filter((c) => c.caseType === t.value),
  })).filter((g) => g.cases.length > 0)

  // Catch any cases with an unrecognized type so nothing is hidden.
  const known = new Set(CASE_TYPES.map((t) => t.value))
  const orphans = closed.filter((c) => !known.has(c.caseType as never))
  if (orphans.length > 0) {
    groups.push({ type: "uncategorized", label: "Uncategorized", cases: orphans })
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Case Depot"
        description="Closed cases, archived and organized by case type for quick reference."
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <CaseDepot groups={groups} total={closed.length} />
      </div>
    </div>
  )
}
