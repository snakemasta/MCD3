import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, Pencil } from "lucide-react"
import { requireUser } from "@/lib/session"
import {
  getMotion,
  getMotionHistory,
  getLatestMotionAiReview,
} from "@/lib/motions"
import { getCase } from "@/app/actions/cases"
import { getLinksForRecord } from "@/lib/record-links"
import { getSettings } from "@/lib/settings"
import { MOTION_TYPES } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { MotionDetailView } from "@/components/motions/motion-detail-view"
import { MotionAiAssistant } from "@/components/motions/motion-ai-assistant"
import { MotionPartyActions } from "@/components/motions/motion-party-actions"
import { RelatedRecordsPanel } from "@/components/shared/related-records-panel"

export default async function MotionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()
  if (!user.permissions.includes("motion:view-all")) redirect("/dashboard")

  const motion = await getMotion(id)
  if (!motion) notFound()

  const [history, aiReview, links, settings, caseRow] = await Promise.all([
    getMotionHistory(id),
    getLatestMotionAiReview(id, "filer"),
    getLinksForRecord("motion", id),
    getSettings("motion"),
    getCase(motion.caseId).catch(() => null),
  ])

  const typeOptions = [...MOTION_TYPES, ...settings.customTypes]
  const isFiler = motion.filedById === user.id
  const canEditDraft = isFiler && ["draft", "needs_more_info"].includes(motion.status)
  const aiAudience = isFiler ? "filer" : "opposing"

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button render={<Link href="/motions" />} variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold">Motion</h1>
        </div>
        {canEditDraft && (
          <Button render={<Link href={`/motions/${id}/edit`} />} variant="outline" size="sm">
            <Pencil className="size-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <MotionDetailView
            motion={motion}
            history={history}
            caseLabel={caseRow ? `${caseRow.caseNumber} — ${caseRow.title}` : null}
            caseHref={caseRow ? `/cases/${caseRow.id}` : null}
            statusLabels={settings.statusLabels}
            typeOptions={typeOptions}
          />
        </div>
        <div className="space-y-6">
          <MotionPartyActions
            motionId={id}
            status={motion.status}
            isFiler={isFiler}
            canRespondOpposing={user.permissions.includes("motion:respond")}
            hasInfoRequest={!!motion.infoRequest}
          />
          {user.permissions.includes("motion:ai") && (
            <MotionAiAssistant
              motionId={id}
              audience={aiAudience}
              initialResult={aiReview ? (aiReview.result as never) : null}
            />
          )}
          <RelatedRecordsPanel fromType="motion" fromId={id} links={links} />
        </div>
      </div>
    </main>
  )
}
