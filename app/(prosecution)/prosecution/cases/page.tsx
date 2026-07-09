import Link from "next/link"
import { requireProsecution } from "@/lib/session"
import { db } from "@/lib/db"
import { cases } from "@/lib/db/schema"
import { ne, desc } from "drizzle-orm"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const STATUS_COLORS: Record<string, string> = {
  intake: "bg-slate-100 text-slate-800",
  investigation: "bg-blue-100 text-blue-800",
  charged: "bg-yellow-100 text-yellow-800",
  pre_trial: "bg-indigo-100 text-indigo-800",
  plea_negotiation: "bg-purple-100 text-purple-800",
  trial: "bg-orange-100 text-orange-800",
  trial_prep: "bg-orange-100 text-orange-800",
  appeal: "bg-pink-100 text-pink-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-red-100 text-red-800",
}

export default async function ProsecutionCasesPage() {
  await requireProsecution()

  // Prosecutors and State Attorneys see all ACTIVE cases — both prosecution-
  // created and defense-created — as a shared case file. Closed cases are
  // excluded. Civilian intake and private defense strategy are filtered out
  // server-side when an individual case is opened.
  const activeCases = await db
    .select()
    .from(cases)
    .where(ne(cases.status, "closed"))
    .orderBy(desc(cases.updatedAt))

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Active Cases</h1>
          <p className="mt-1 text-muted-foreground">
            Shared case file for all active prosecution and defense matters
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1 text-lg">
          {activeCases.length} Cases
        </Badge>
      </div>

      {activeCases.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No active cases.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeCases.map((caseItem) => (
            <Card key={caseItem.id} className="p-6 transition-colors hover:bg-muted/50">
              <Link href={`/prosecution/cases/${caseItem.id}`} className="block">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{caseItem.title}</h3>
                      <Badge variant="secondary" className="capitalize">
                        {caseItem.side}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Case #{caseItem.caseNumber}</p>
                  </div>
                  <Badge className={STATUS_COLORS[caseItem.status] || "bg-gray-100 text-gray-800"}>
                    {caseItem.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">
                      {caseItem.defendantName || caseItem.clientName || "Unknown"}
                    </p>
                    <p>Defendant</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{caseItem.charges || "—"}</p>
                    <p>Charges</p>
                  </div>
                  <div>
                    <p className="font-medium capitalize text-foreground">{caseItem.priority}</p>
                    <p>Priority</p>
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
