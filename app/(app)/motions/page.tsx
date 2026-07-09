import Link from "next/link"
import { Plus } from "lucide-react"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/session"
import { listCases } from "@/app/actions/cases"
import { listMotions } from "@/lib/motions"
import { getSettings } from "@/lib/settings"
import { MOTION_TYPES } from "@/lib/constants"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { MotionList, type MotionListItem } from "@/components/motions/motion-list"

export default async function MotionsPage() {
  const user = await requireUser()
  if (!user.permissions.includes("motion:view-all")) redirect("/dashboard")

  const [motions, cases, settings] = await Promise.all([
    listMotions(),
    listCases(),
    getSettings("motion"),
  ])

  const caseMap = new Map(cases.map((c) => [c.id, c]))
  const items: MotionListItem[] = motions.map((m) => {
    const c = caseMap.get(m.caseId)
    return {
      id: m.id,
      motionNumber: m.motionNumber,
      title: m.title,
      motionType: m.motionType,
      filingSide: m.filingSide,
      filedByName: m.filedByName,
      caseId: m.caseId,
      caseNumber: c?.caseNumber ?? null,
      caseTitle: c?.title ?? null,
      status: m.status,
      judgeName: m.judgeName,
      urgency: m.urgency,
      hearingRequested: m.hearingRequested,
      createdAt: m.createdAt.toISOString(),
      decidedAt: m.decidedAt ? m.decidedAt.toISOString() : null,
    }
  })

  const typeOptions = [...MOTION_TYPES, ...settings.customTypes]
  const filers = Array.from(
    new Map(motions.filter((m) => m.filedByName).map((m) => [m.filedByName!, m.filedByName!])).keys(),
  ).map((name) => ({ id: name, name }))

  return (
    <div className="flex flex-col">
      <PageHeader title="Motions" description="Motions filed across your cases. Track status and rulings.">
        {user.permissions.includes("motion:file") && (
          <Button nativeButton={false} render={<Link href="/motions/new" />}>
            <Plus data-icon="inline-start" />
            File Motion
          </Button>
        )}
      </PageHeader>
      <div className="p-4 sm:p-6 lg:p-8">
        <MotionList
          motions={items}
          filterOptions={{ cases: cases.map((c) => ({ id: c.id, label: c.caseNumber })), filers }}
          typeOptions={typeOptions}
          statusLabels={settings.statusLabels}
          basePath="/motions"
        />
      </div>
    </div>
  )
}
