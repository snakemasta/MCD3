import { redirect } from "next/navigation"
import { listCases } from "@/app/actions/cases"
import { getCurrentUser } from "@/lib/session"
import { PageHeader } from "@/components/page-header"
import { CasesTable } from "@/components/cases-table"

export default async function MyCasesPage() {
  const current = await getCurrentUser()
  if (!current) redirect("/sign-in")

  const cases = await listCases({ assignedTo: current.id })

  return (
    <div className="flex flex-col">
      <PageHeader
        title="My Assigned Cases"
        description="Cases where you are the assigned counsel or paralegal."
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <CasesTable cases={cases} />
      </div>
    </div>
  )
}
