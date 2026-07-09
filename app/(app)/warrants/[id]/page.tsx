import Link from "next/link"
import { notFound } from "next/navigation"
import { requireStaffPermission } from "@/lib/session"
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

export default async function DefenseWarrantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireStaffPermission("warrant:view-all")
  const warrant = await getWarrant(id)
  if (!warrant) notFound()

  const [history, closeout, aiReview, settings] = await Promise.all([
    getWarrantHistory(id),
    getWarrantCloseout(id),
    getLatestAiReview(id, "defense"),
    getSettings("warrant"),
  ])

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Button render={<Link href="/warrants" />} variant="ghost" size="sm">
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold">Warrant Detail</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <WarrantDetailView
            warrant={warrant}
            history={history}
            closeout={closeout}
            statusLabels={settings.statusLabels}
            typeOptions={[...WARRANT_TYPES, ...settings.customTypes]}
          />
        </div>
        <div className="space-y-6">
          <WarrantCompleteness warrant={warrant} />
          {user.permissions.includes("warrant:ai") && (
            <WarrantAiAssistant
              warrantId={id}
              audience="defense"
              initialResult={aiReview ? (aiReview.result as never) : null}
            />
          )}
        </div>
      </div>
    </main>
  )
}
