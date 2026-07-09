import { requireCivilian } from "@/lib/session"
import { db } from "@/lib/db"
import { lawLibrary } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Penal Code / SOP Bank — MCD CaseOps Platform",
  description: "Educational law library for clients.",
}

export default async function ClientLawLibraryPage() {
  await requireCivilian()

  // Fetch only active laws for clients to view
  const laws = await db
    .select()
    .from(lawLibrary)
    .where(eq(lawLibrary.status, "active"))
    .orderBy(lawLibrary.category)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start gap-3">
        <BookOpen className="size-6 text-primary mt-1 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold">Penal Code / SOP Bank</h1>
          <p className="text-muted-foreground mt-1">
            Educational reference materials to help you understand applicable laws and procedures.
          </p>
        </div>
      </div>

      {laws.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No laws are currently available in the library.
        </Card>
      ) : (
        <div className="space-y-4">
          {laws.map((law) => (
            <Link key={law.id} href={`/portal/library/${law.id}`}>
              <Card className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold line-clamp-2">{law.title}</h3>
                    {law.codeSection && (
                      <p className="text-sm text-muted-foreground mt-1">{law.codeSection}</p>
                    )}
                    {law.summary && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{law.summary}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {law.category.replace("_", " ")}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
