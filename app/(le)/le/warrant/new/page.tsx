import Link from "next/link"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { requireLawEnforcement } from "@/lib/session"
import { db } from "@/lib/db"
import { leReports } from "@/lib/db/schema"
import { getSettings } from "@/lib/settings"
import { WARRANT_TYPES, WARRANT_RISK_LEVELS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { WarrantForm } from "@/components/warrants/warrant-form"
import { ArrowLeft } from "lucide-react"

export default async function NewWarrantPage() {
  const user = await requireLawEnforcement()
  if (!user.permissions.includes("warrant:submit")) redirect("/le/warrants")

  const [reports, settings] = await Promise.all([
    db.select().from(leReports).where(eq(leReports.officerId, user.id)),
    getSettings("warrant"),
  ])

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Button render={<Link href="/le/warrants" />} variant="ghost" size="sm">
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-3xl font-bold">Request a Warrant</h1>
      </div>
      <p className="max-w-2xl text-muted-foreground">
        Build a warrant application for judicial review. Use the AI assistant after saving a draft to strengthen
        probable cause and catch missing details before submission.
      </p>

      <WarrantForm
        mode="create"
        warrantTypes={[...WARRANT_TYPES, ...settings.customTypes]}
        riskLevels={[...WARRANT_RISK_LEVELS]}
        policeReports={reports.map((r) => ({ id: r.id, label: `#${r.reportNumber} — ${r.title}` }))}
        officerName={user.name}
      />
    </main>
  )
}
