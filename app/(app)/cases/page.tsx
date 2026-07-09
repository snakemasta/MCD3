import Link from "next/link"
import { Plus } from "lucide-react"
import { requireUser } from "@/lib/session"
import { listCases } from "@/app/actions/cases"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { CasesTable } from "@/components/cases-table"

export default async function CasesPage() {
  const user = await requireUser()
  // Closed cases are archived in the Case Depot, so keep them out of the
  // active repository view.
  const cases = (await listCases()).filter((c) => c.status !== "closed")

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Case Repository"
        description="All cases across the office. Search, filter, and open a case to manage it."
      >
        {user.permissions.includes("case:create") && (
          <Button nativeButton={false} render={<Link href="/cases/new" />}>
            <Plus data-icon="inline-start" />
            New Case
          </Button>
        )}
      </PageHeader>
      <div className="p-4 sm:p-6 lg:p-8">
        <CasesTable cases={cases} />
      </div>
    </div>
  )
}
