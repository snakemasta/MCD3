import Link from "next/link"
import { requireLawEnforcement } from "@/lib/session"
import { LEReportForm } from "@/components/le-report-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function NewReportPage() {
  await requireLawEnforcement()

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Button render={<Link href="/le" />} variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">Submit Incident Report</h1>
      </div>

      <p className="text-muted-foreground max-w-2xl">
        Complete and submit an incident report for prosecution review. Include all relevant details, evidence links, and witness information.
      </p>

      <div className="max-w-3xl">
        <LEReportForm />
      </div>
    </main>
  )
}
