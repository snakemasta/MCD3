import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requireUser } from "@/lib/session"
import { getMotion } from "@/lib/motions"
import { listCases } from "@/app/actions/cases"
import { getSettings } from "@/lib/settings"
import { MOTION_TYPES, MOTION_URGENCY_LEVELS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { MotionForm } from "@/components/motions/motion-form"
import type { EvidenceLink } from "@/lib/motion-utils"

export default async function EditMotionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()
  const motion = await getMotion(id)
  if (!motion) notFound()

  const isFiler = motion.filedById === user.id
  if (!isFiler && user.role !== "admin") redirect(`/motions/${id}`)
  if (!["draft", "needs_more_info"].includes(motion.status)) redirect(`/motions/${id}`)

  const [cases, settings] = await Promise.all([listCases(), getSettings("motion")])

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Button render={<Link href={`/motions/${id}`} />} variant="ghost" size="sm">
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-3xl font-bold">Edit Motion</h1>
      </div>

      <MotionForm
        mode="edit"
        initial={{
          id: motion.id,
          caseId: motion.caseId,
          title: motion.title,
          motionType: motion.motionType,
          relief: motion.relief ?? "",
          argument: motion.argument ?? "",
          factualBasis: motion.factualBasis ?? "",
          authoritiesCited: motion.authoritiesCited ?? "",
          evidenceLinks: (Array.isArray(motion.evidenceLinks) ? motion.evidenceLinks : []) as EvidenceLink[],
          hearingRequested: motion.hearingRequested,
          urgency: motion.urgency,
        }}
        motionTypes={[...MOTION_TYPES, ...settings.customTypes]}
        urgencyLevels={[...MOTION_URGENCY_LEVELS]}
        cases={cases.map((c) => ({ id: c.id, label: `${c.caseNumber} — ${c.title}` }))}
        lockedCaseId={motion.caseId}
        basePath="/motions"
      />
    </main>
  )
}
