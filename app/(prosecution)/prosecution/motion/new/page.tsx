import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requireProsecution } from "@/lib/session"
import { listCases } from "@/app/actions/cases"
import { getSettings } from "@/lib/settings"
import { MOTION_TYPES, MOTION_URGENCY_LEVELS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { MotionForm } from "@/components/motions/motion-form"

export default async function ProsecutionNewMotionPage({
  searchParams,
}: {
  searchParams: Promise<{ caseId?: string }>
}) {
  const user = await requireProsecution()
  if (!user.permissions.includes("motion:file")) redirect("/prosecution/motions")

  const { caseId } = await searchParams
  const [cases, settings] = await Promise.all([listCases(), getSettings("motion")])

  if (cases.length === 0) {
    return (
      <main className="flex-1 space-y-4 p-6">
        <h1 className="text-2xl font-bold">File a Motion</h1>
        <p className="text-muted-foreground">There are no cases available to file a motion on yet.</p>
        <Button render={<Link href="/prosecution/cases" />}>Go to cases</Button>
      </main>
    )
  }

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Button render={<Link href="/prosecution/motions" />} variant="ghost" size="sm">
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-3xl font-bold">File a Motion</h1>
      </div>
      <p className="max-w-2xl text-muted-foreground">
        Draft a motion for the court on behalf of the State. Save a draft and use the AI assistant to strengthen
        your argument before filing.
      </p>

      <MotionForm
        mode="create"
        motionTypes={[...MOTION_TYPES, ...settings.customTypes]}
        urgencyLevels={[...MOTION_URGENCY_LEVELS]}
        cases={cases.map((c) => ({ id: c.id, label: `${c.caseNumber} — ${c.title}` }))}
        lockedCaseId={caseId}
        basePath="/prosecution/motion"
      />
    </main>
  )
}
