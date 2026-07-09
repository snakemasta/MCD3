import { requireUser } from "@/lib/session"
import { hasPerm } from "@/lib/constants"
import { db } from "@/lib/db"
import { lawLibrary } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Brain, FileText, Sparkles, Download } from "lucide-react"
import Link from "next/link"
import { DeleteLawButton } from "@/components/delete-law-button"
import { LawStatusActions } from "@/components/law-status-actions"

export const metadata = { title: "Law Entry — MCD CaseOps Platform" }

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Published", variant: "default" },
  draft: { label: "Draft — pending approval", variant: "secondary" },
  archived: { label: "Archived", variant: "destructive" },
}

export default async function LawDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()

  if (!hasPerm(user.permissions, "law-library:view")) {
    return notFound()
  }

  const { id } = await params

  const [law] = await db.select().from(lawLibrary).where(eq(lawLibrary.id, id)).limit(1)

  if (!law) return notFound()

  const isMemory = law.entryKind === "memory_bank"
  const statusBadge = STATUS_BADGE[law.status] ?? STATUS_BADGE.draft
  const canEdit = hasPerm(user.permissions, "law-library:edit")
  const canDelete = hasPerm(user.permissions, "law-library:delete")
  const canApprove = hasPerm(user.permissions, "law-library:approve")
  const canArchive = hasPerm(user.permissions, "law-library:archive")

  return (
    <div className="space-y-6">
      <Link
        href="/law-library"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Penal Code / SOP Bank
      </Link>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            {isMemory ? (
              <Brain className="size-5 shrink-0 text-muted-foreground" />
            ) : (
              <FileText className="size-5 shrink-0 text-muted-foreground" />
            )}
            <h1 className="text-2xl font-bold text-balance">{law.title}</h1>
          </div>
          {law.codeSection && <p className="mt-1 text-sm text-muted-foreground">{law.codeSection}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          <Badge variant="outline" className="capitalize">
            {isMemory ? "Memory Bank" : law.category.replace(/_/g, " ")}
          </Badge>
          {!isMemory && <Badge variant="outline">{law.jurisdiction.replace(/_/g, " ")}</Badge>}
          {law.aiEnabled ? (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="size-3" />
              AI-enabled
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              AI disabled
            </Badge>
          )}
        </div>

        {law.summary && (
          <Card className="bg-muted/50 p-4">
            <h2 className="mb-2 text-sm font-semibold">Summary</h2>
            <p className="whitespace-pre-wrap text-sm">{law.summary}</p>
          </Card>
        )}

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Full Text</h2>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <pre className="whitespace-pre-wrap break-words font-mono text-sm text-muted-foreground">
              {law.fullText}
            </pre>
          </div>
        </Card>

        {law.documentUrl && (
          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold">Attached Document</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Original document with extracted, searchable text.
            </p>
            <Button
              variant="outline"
              render={
                <a
                  href={`/api/laws/file?pathname=${encodeURIComponent(law.documentUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <Download className="size-4" />
              Download Document
            </Button>
          </Card>
        )}

        {law.tags && law.tags.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {law.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {law.relatedCharges && law.relatedCharges.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold">Related Charges</h2>
            <div className="flex flex-wrap gap-2">
              {law.relatedCharges.map((charge) => (
                <Badge key={charge} variant="outline">
                  {charge}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {law.sourceUrl && (
          <div>
            <h2 className="mb-2 text-sm font-semibold">Source</h2>
            <Button variant="outline" render={<a href={law.sourceUrl} target="_blank" rel="noopener noreferrer" />}>
              View Original Source
            </Button>
          </div>
        )}

        {(canEdit || canDelete || canApprove || canArchive) && (
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <LawStatusActions
              lawId={law.id}
              status={law.status}
              canApprove={canApprove}
              canArchive={canArchive}
            />
            {canEdit && (
              <Button variant="outline" render={<Link href={`/law-library/${law.id}/edit`} />}>
                Edit Entry
              </Button>
            )}
            {canDelete && <DeleteLawButton lawId={law.id} />}
          </div>
        )}
      </div>
    </div>
  )
}
