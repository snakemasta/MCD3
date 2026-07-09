import { notFound } from "next/navigation"
import { requireUser } from "@/lib/session"
import { getCase } from "@/app/actions/cases"
import { listEvidence } from "@/app/actions/evidence"
import { listTimeline } from "@/app/actions/timeline"
import { listPlanItems } from "@/app/actions/plan"
import { listDrafts } from "@/app/actions/drafts"
import { listDeadlines } from "@/app/actions/deadlines"
import { listCaseMessages } from "@/app/actions/case-chat"
import { getLatestAnalysis } from "@/app/actions/analysis"
import { listTeam } from "@/app/actions/team"
import { getCaseClientPanel } from "@/lib/case-clients"
import { listMotions } from "@/lib/motions"
import { getSettings } from "@/lib/settings"
import { MOTION_TYPES } from "@/lib/constants"
import { CaseDetail } from "@/components/case-detail"

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()
  const caseData = await getCase(id)
  if (!caseData) notFound()

  const [evidence, timeline, plan, drafts, deadlines, messages, analysis, team, clientPanel, motionRows, motionSettings] =
    await Promise.all([
      listEvidence(id),
      listTimeline(id),
      listPlanItems(id),
      listDrafts(id),
      listDeadlines(id),
      listCaseMessages(id),
      getLatestAnalysis(id),
      listTeam(),
      getCaseClientPanel(id),
      listMotions({ caseId: id }),
      getSettings("motion"),
    ])

  const canViewMotions = user.permissions.includes("motion:view-all")
  const motions = canViewMotions
    ? motionRows.map((m) => ({
        id: m.id,
        motionNumber: m.motionNumber,
        title: m.title,
        motionType: m.motionType,
        filingSide: m.filingSide,
        filedByName: m.filedByName,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
        decidedAt: m.decidedAt ? m.decidedAt.toISOString() : null,
      }))
    : undefined
  const motionTypeOptions = [...MOTION_TYPES.map((t) => ({ value: t.value, label: t.label })), ...motionSettings.customTypes]
  const canFileMotion = user.permissions.includes("motion:file")

  return (
    <CaseDetail
      role={user.role}
      permissions={user.permissions}
      caseData={caseData}
      evidence={evidence}
      timeline={timeline}
      plan={plan}
      drafts={drafts}
      deadlines={deadlines}
      messages={messages}
      analysis={analysis}
      team={team}
      clientPanel={clientPanel}
      motions={motions}
      motionBasePath="/motions"
      motionNewHref={canFileMotion ? `/motions/new?caseId=${id}` : undefined}
      motionTypeOptions={motionTypeOptions}
      motionStatusLabels={motionSettings.statusLabels}
    />
  )
}
