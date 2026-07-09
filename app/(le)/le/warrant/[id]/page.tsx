import Link from "next/link"
import { notFound } from "next/navigation"
import { requireLawEnforcement } from "@/lib/session"
import {
  getWarrant,
  getWarrantHistory,
  getWarrantCloseout,
  getLatestAiReview,
} from "@/lib/warrants"
import { getSettings } from "@/lib/settings"
import { WARRANT_TYPES } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Pencil } from "lucide-react"
import { WarrantDetailView } from "@/components/warrants/warrant-detail-view"
import { WarrantCompleteness } from "@/components/warrants/warrant-completeness"
import { WarrantAiAssistant } from "@/components/warrants/warrant-ai-assistant"
import { InfoResponseForm } from "@/components/warrants/info-response-form"
import { CloseoutDialog } from "@/components/warrants/closeout-dialog"
import { SubmitWarrantButton } from "@/components/warrants/submit-warrant-button"

export default async function LEWarrantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireLawEnforcement()
  const warrant = await getWarrant(id)
  if (!warrant) notFound()
  if (warrant.requestingOfficerId !== user.id && user.role !== "admin") notFound()

  const [history, closeout, aiReview, settings] = await Promise.all([
    getWarrantHistory(id),
    getWarrantCloseout(id),
    getLatestAiReview(id, "law_enforcement"),
    getSettings("warrant"),
  ])

  const typeOptions = [...WARRANT_TYPES, ...settings.customTypes]
  const canEdit = ["draft", "needs_more_info"].includes(warrant.status)
  const canSubmit = warrant.status === "draft"
  const canClose =
    user.permissions.includes("warrant:close") &&
    ["approved", "not_active"].includes(warrant.status)

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button render={<Link href="/le/warrants" />} variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold">Warrant Detail</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button render={<Link href={`/le/warrant/${id}/edit`} />} variant="outline">
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
          {canSubmit && <SubmitWarrantButton warrantId={id} />}
          {canClose && <CloseoutDialog warrantId={id} />}
        </div>
      </div>

      {warrant.status === "needs_more_info" && warrant.infoRequest && (
        <InfoResponseForm warrantId={id} question={warrant.infoRequest} />
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
          <WarrantCompleteness warrant={warrant} />
          {user.permissions.includes("warrant:ai") && (
            <WarrantAiAssistant
              warrantId={id}
              audience="law_enforcement"
              initialResult={aiReview ? (aiReview.result as never) : null}
            />
          )}
        </div>
      </div>
    </main>
  )
}
