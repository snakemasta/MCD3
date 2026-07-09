import { notFound } from "next/navigation"
import { requireProsecution } from "@/lib/session"
import { loadProsecutionCaseFile } from "@/lib/prosecution-case-file"
import { SharedCaseFile } from "@/components/prosecution/shared-case-file"

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireProsecution()
  const { id } = await params

  const file = await loadProsecutionCaseFile(user, id)
  if (!file || !file.access.canView) notFound()

  return (
    <main className="flex-1">
      <SharedCaseFile
        caseItem={file.caseItem}
        isOwnCase={file.access.isOwnCase}
        sections={file.access.sections}
        canViewEvidence={file.access.canViewEvidence}
        canViewDefenseNotes={file.access.canViewDefenseNotes}
        charges={file.charges}
        pleas={file.pleas}
        witnesses={file.witnesses}
        evidence={file.evidence}
        timeline={file.timeline}
        deadlines={file.deadlines}
        motions={file.motions}
        warrants={file.warrants}
        policeReports={file.policeReports}
        lawLinks={file.lawLinks}
        defenseAi={file.defenseAi}
        prosecutionAi={file.prosecutionAi}
        canUseAi={user.permissions.includes("prosecution:ai")}
      />
    </main>
  )
}
