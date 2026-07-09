import { requireJudge } from "@/lib/session"
import { listMotions } from "@/lib/motions"
import { getSettings } from "@/lib/settings"
import { MOTION_TYPES } from "@/lib/constants"
import { db } from "@/lib/db"
import { cases } from "@/lib/db/schema"
import { MotionList, type MotionListItem } from "@/components/motions/motion-list"

export default async function JudgeMotionsPage() {
  await requireJudge()

  const [motions, caseRows, settings] = await Promise.all([
    listMotions(),
    db.select({ id: cases.id, caseNumber: cases.caseNumber, title: cases.title }).from(cases),
    getSettings("motion"),
  ])

  const caseMap = new Map(caseRows.map((c) => [c.id, c]))
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
    <main className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Motions</h1>
        <p className="text-muted-foreground">Motions before the court. Open one to review and rule.</p>
      </div>
      <MotionList
        motions={items}
        filterOptions={{ cases: caseRows.map((c) => ({ id: c.id, label: c.caseNumber })), filers }}
        typeOptions={typeOptions}
        statusLabels={settings.statusLabels}
        basePath="/judge/motion"
      />
    </main>
  )
}
