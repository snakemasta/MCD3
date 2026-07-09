import Link from "next/link"
import { notFound } from "next/navigation"
import { requireJudge } from "@/lib/session"
import {
  getWarrant,
  getWarrantHistory,
  getWarrantCloseout,
  getLatestAiReview,
} from "@/lib/warrants"
import { getSettings } from "@/lib/settings"
import { WARRANT_TYPES } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { WarrantDetailView } from "@/components/warrants/warrant-detail-view"
import { WarrantCompleteness } from "@/components/warrants/warrant-completeness"
import { WarrantAiAssistant } from "@/components/warrants/warrant-ai-assistant"
import { JudgeDecisionPanel } from "@/components/warrants/judge-decision-panel"

export default async function JudgeWarrantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireJudge()
  const warrant = await getWarrant(id)
  if (!warrant) notFound()

  const [history, closeout, aiReview, settings] = await Promise.all([
    getWarrantHistory(id),
    getWarrantCloseout(id),
    getLatestAiReview(id, "judge"),
    getSettings("warrant"),
  ])

  const typeOptions = [...WARRANT_TYPES, ...settings.customTypes]

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Button render={<Link href="/judge/queue" />} variant="ghost" size="sm">
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold">Warrant Review</h1>
      </div>

      {warrant.infoResponse && warrant.status === "submitted" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h2 className="text-sm font-semibold text-blue-900">Officer&apos;s response to your request</h2>
          <p className="mt-1 text-sm">{warrant.infoResponse}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <WarrantDetailView
            warrant={warrant}
            history={history}
            closeout={closeout}
            statusLabels={settings.statusLabels}
            typeOptions={typeOptions}
          />
        </div>
        <div className="space-y-6">
          <JudgeDecisionPanel
            warrantId={id}
            status={warrant.status}
            initialNotes={warrant.judgeNotes}
            canApprove={user.permissions.includes("warrant:approve")}
          />
          <WarrantCompleteness warrant={warrant} />
          {user.permissions.includes("warrant:ai") && (
            <WarrantAiAssistant
              warrantId={id}
              audience="judge"
              initialResult={aiReview ? (aiReview.result as never) : null}
            />
          )}
        </div>
      </div>
    </main>
  )
}
