import { redirect } from "next/navigation"
import { requireUser } from "@/lib/session"
import { PageHeader } from "@/components/page-header"
import { NewCaseForm } from "@/components/new-case-form"

export default async function NewCasePage() {
  const user = await requireUser()
  if (!user.permissions.includes("case:create")) redirect("/cases")

  return (
    <div className="flex flex-col">
      <PageHeader
        title="New Case"
        description="Create a case and let MCD CaseOps Platform auto-assign the right team."
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <NewCaseForm />
      </div>
    </div>
  )
}
