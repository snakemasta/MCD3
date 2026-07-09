import { requireUser } from "@/lib/session"
import { hasPerm } from "@/lib/constants"
import { db } from "@/lib/db"
import { lawLibrary } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { redirect, notFound } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { LawForm } from "@/components/law-form"

export const metadata = { title: "Edit Law Entry — MCD CaseOps Platform" }

export default async function EditLawPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()

  if (!hasPerm(user.permissions, "law-library:edit")) {
    redirect("/law-library")
  }

  const { id } = await params

  const [law] = await db
    .select()
    .from(lawLibrary)
    .where(eq(lawLibrary.id, id))
    .limit(1)

  if (!law) return notFound()

  return (
    <>
      <PageHeader
        title="Edit Law Entry"
        description={`Editing: ${law.title}`}
      />
      <div className="max-w-2xl">
        <LawForm userId={user.id} initialData={law} />
      </div>
    </>
  )
}
