import { requireCivilian } from "@/lib/session"
import { db } from "@/lib/db"
import { lawLibrary } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const metadata = { title: "Law Entry — MCD CaseOps Platform" }

export default async function ClientLawDetailPage({ params }: { params: { id: string } }) {
  await requireCivilian()

  const [law] = await db
    .select()
    .from(lawLibrary)
    .where(eq(lawLibrary.id, params.id))
    .limit(1)

  if (!law || law.status !== "active") return notFound()

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/portal/library"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Penal Code / SOP Bank
      </Link>

      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{law.title}</h1>
          {law.codeSection && (
            <p className="text-sm text-muted-foreground mt-1">{law.codeSection}</p>
          )}
        </div>

        <Badge variant="outline" className="capitalize">
          {law.category.replace("_", " ")}
        </Badge>

        {law.summary && (
          <Card className="p-4 bg-muted/50">
            <h2 className="font-semibold text-sm mb-2">Summary</h2>
            <p className="text-sm whitespace-pre-wrap">{law.summary}</p>
          </Card>
        )}

        <Card className="p-4">
          <h2 className="font-semibold text-sm mb-3">Full Text</h2>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <pre className="text-sm whitespace-pre-wrap break-words font-mono text-muted-foreground">
              {law.fullText}
            </pre>
          </div>
        </Card>

        {law.sourceUrl && (
          <div>
            <Button variant="outline" render={<a href={law.sourceUrl} target="_blank" rel="noopener noreferrer" />}>
              View Original Source
            </Button>
          </div>
        )}

        <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Educational Purpose:</strong> This law library is provided for informational purposes to help you understand applicable laws and procedures. For legal advice specific to your situation, please consult with your attorney.
          </p>
        </Card>
      </div>
    </div>
  )
}
