import { requireUser } from "@/lib/session"
import { hasPerm } from "@/lib/constants"
import { db } from "@/lib/db"
import { lawLibrary } from "@/lib/db/schema"
import { eq, desc, inArray } from "drizzle-orm"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { LawLibraryList } from "@/components/law-library-list"
import { Plus } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Penal Code / SOP Bank — MCD CaseOps Platform",
  description: "Manage law library entries, statutes, and case law.",
}

export default async function LawLibraryPage() {
  const user = await requireUser()

  if (!hasPerm(user.permissions, "law-library:view")) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">You do not have access to the law library.</p>
      </div>
    )
  }

  const canCreate = hasPerm(user.permissions, "law-library:create")
  // Reviewers (anyone who can manage entries) can also see drafts and archived items.
  const canManage =
    canCreate ||
    hasPerm(user.permissions, "law-library:edit") ||
    hasPerm(user.permissions, "law-library:approve") ||
    hasPerm(user.permissions, "law-library:archive") ||
    hasPerm(user.permissions, "law-library:delete")

  const laws = await db
    .select()
    .from(lawLibrary)
    .where(canManage ? inArray(lawLibrary.status, ["active", "draft", "archived"]) : eq(lawLibrary.status, "active"))
    .orderBy(desc(lawLibrary.createdAt))

  return (
    <>
      <PageHeader
        title="Penal Code / SOP Bank"
        description="Statutes, case law, procedural guidance, and the AI Memory Bank."
      >
        {canCreate && (
          <Button render={<Link href="/law-library/new" />}>
            <Plus className="size-4" />
            Add Entry
          </Button>
        )}
      </PageHeader>

      <LawLibraryList
        canManage={canManage}
        canCreate={canCreate}
        laws={laws.map((law) => ({
          id: law.id,
          title: law.title,
          category: law.category,
          jurisdiction: law.jurisdiction,
          entryKind: law.entryKind,
          status: law.status,
          aiEnabled: law.aiEnabled,
          codeSection: law.codeSection,
          summary: law.summary,
          tags: law.tags,
          hasDocument: Boolean(law.documentUrl),
        }))}
      />
    </>
  )
}
