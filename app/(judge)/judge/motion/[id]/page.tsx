import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requireJudge } from "@/lib/session"
import {
  getMotion,
  getMotionHistory,
  getLatestMotionAiReview,
} from "@/lib/motions"
import { getLinksForRecord } from "@/lib/record-links"
import { getSettings } from "@/lib/settings"
import { MOTION_TYPES } from "@/lib/constants"
import { db } from "@/lib/db"
import { cases } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Button } from "@/components/ui/button"
import { MotionDetailView } from "@/components/motions/motion-detail-view"
import { MotionAiAssistant } from "@/components/motions/motion-ai-assistant"
import { MotionDecisionPanel } from "@/components/motions/motion-decision-panel"
import { RelatedRecordsPanel } from "@/components/shared/related-records-panel"

export default async function JudgeMotionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireJudge()
  const motion = await getMotion(id)
  if (!motion) notFound()

  const [history, aiReview, links, settings, caseRow] = await Promise.all([
    getMotionHistory(id),
    getLatestMotionAiReview(id, "judge"),
    getLinksForRecord("motion", id),
    getSettings("motion"),
    db.select({ id: cases.id, caseNumber: cases.caseNumber, title: cases.title }).from(cases).where(eq(cases.id, motion.caseId)).limit(1),
  ])

  const typeOptions = [...MOTION_TYPES, ...settings.customTypes]
  const c = caseRow[0]

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Button render={<Link href="/judge/motions" />} variant="ghost" size="sm">
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold">Motion Review</h1>
      </div>

      {motion.infoResponse && motion.status === "submitted" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h2 className="text-sm font-semibold text-blue-900">Movant&apos;s response to your request</h2>
          <p className="mt-1 text-sm">{motion.infoResponse}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <MotionDetailView
            motion={motion}
            history={history}
            caseLabel={c ? `${c.caseNumber} — ${c.title}` : null}
            caseHref={c ? `/judge/case/${c.id}` : null}
            statusLabels={settings.statusLabels}
            typeOptions={typeOptions}
          />
        </div>
        <div className="space-y-6">
          <MotionDecisionPanel
            motionId={id}
            status={motion.status}
            canRule={user.permissions.includes("motion:rule")}
          />
          {user.permissions.includes("motion:ai") && (
            <MotionAiAssistant
              motionId={id}
              audience="judge"
              initialResult={aiReview ? (aiReview.result as never) : null}
            />
          )}
          <RelatedRecordsPanel fromType="motion" fromId={id} links={links} />
        </div>
      </div>
    </main>
  )
}
