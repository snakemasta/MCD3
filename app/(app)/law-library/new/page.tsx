import { requireUser } from "@/lib/session"
import { hasPerm } from "@/lib/constants"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { LawForm } from "@/components/law-form"

export const metadata = { title: "Add Law Entry — MCD CaseOps Platform" }

export default async function NewLawPage() {
  const user = await requireUser()

  if (!hasPerm(user.permissions, "law-library:create")) {
    redirect("/law-library")
  }

  return (
    <>
      <PageHeader
        title="Add Law Entry"
        description="Create a new statute, case law summary, or procedural rule."
      />
      <div className="max-w-2xl">
        <LawForm userId={user.id} />
      </div>
    </>
  )
}
