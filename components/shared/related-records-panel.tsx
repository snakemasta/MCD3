"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Link2, Plus, X, Search, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  createRecordLink,
  deleteRecordLink,
  searchRecordsToLink,
} from "@/app/actions/record-links"

type RecordType = "warrant" | "motion" | "case" | "report" | "evidence" | "knowledge"

interface ResolvedLink {
  id: string
  relation: string
  note: string | null
  type: RecordType
  recordId: string
  label: string
  href: string | null
}

interface SearchResult {
  type: RecordType
  id: string
  label: string
}

const TYPE_LABELS: Record<RecordType, string> = {
  warrant: "Warrant",
  motion: "Motion",
  case: "Case",
  report: "Report",
  evidence: "Evidence",
  knowledge: "Knowledge",
}

export function RelatedRecordsPanel({
  fromType,
  fromId,
  links,
  canEdit = true,
}: {
  fromType: RecordType
  fromId: string
  links: ResolvedLink[]
  canEdit?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [pending, startTransition] = useTransition()

  async function doSearch() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await searchRecordsToLink(query.trim())
      setResults(res.filter((r) => !(r.type === fromType && r.id === fromId)))
    } catch {
      toast.error("Search failed")
    } finally {
      setSearching(false)
    }
  }

  function addLink(r: SearchResult) {
    startTransition(async () => {
      try {
        await createRecordLink({ fromType, fromId, toType: r.type, toId: r.id })
        toast.success("Record linked")
        setOpen(false)
        setQuery("")
        setResults([])
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not link record")
      }
    })
  }

  function removeLink(id: string) {
    startTransition(async () => {
      try {
        await deleteRecordLink(id)
        toast.success("Link removed")
        router.refresh()
      } catch {
        toast.error("Could not remove link")
      }
    })
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Link2 className="size-4" />
          </span>
          <h2 className="text-sm font-semibold">Related Records</h2>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Link
          </Button>
        )}
      </div>

      {links.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No linked records yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {links.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="shrink-0">
                    {TYPE_LABELS[l.type]}
                  </Badge>
                  {l.href ? (
                    <Link href={l.href} className="truncate text-sm font-medium hover:underline">
                      {l.label}
                    </Link>
                  ) : (
                    <span className="truncate text-sm font-medium">{l.label}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {l.href && (
                  <Button render={<Link href={l.href} />} size="icon" variant="ghost" className="size-7">
                    <ExternalLink className="size-3.5" />
                    <span className="sr-only">Open</span>
                  </Button>
                )}
                {canEdit && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    disabled={pending}
                    onClick={() => removeLink(l.id)}
                  >
                    <X className="size-3.5" />
                    <span className="sr-only">Remove link</span>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link a Record</DialogTitle>
            <DialogDescription>
              Search warrants, motions, cases, and reports to connect to this record.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="Search by title or number…"
              aria-label="Search records to link"
            />
            <Button variant="outline" onClick={doSearch} disabled={searching}>
              <Search className="size-4" />
            </Button>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {results.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {searching ? "Searching…" : "No results yet. Try a search."}
              </p>
            ) : (
              results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  type="button"
                  disabled={pending}
                  onClick={() => addLink(r)}
                  className="flex w-full items-center gap-2 rounded-lg border border-border p-2.5 text-left hover:bg-muted/50 disabled:opacity-50"
                >
                  <Badge variant="secondary" className="shrink-0">
                    {TYPE_LABELS[r.type]}
                  </Badge>
                  <span className="truncate text-sm">{r.label}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
