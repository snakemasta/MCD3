"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Archive, ArchiveRestore, BrainCircuit, Sparkles, Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  createMemoryEntry,
  updateMemoryEntry,
  setMemoryAiEnabled,
  setMemoryStatus,
  type MemoryEntryRow,
} from "@/app/actions/memory-bank"

const CATEGORIES = [
  { value: "sop", label: "Standard Operating Procedure" },
  { value: "policy", label: "Policy" },
  { value: "training", label: "Training Material" },
  { value: "playbook", label: "Playbook / Strategy" },
  { value: "reference", label: "Reference / FAQ" },
  { value: "ai_knowledge", label: "Custom AI Knowledge" },
]

function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value
}

interface DraftState {
  id: string | null
  title: string
  category: string
  summary: string
  fullText: string
  tags: string
}

const EMPTY_DRAFT: DraftState = {
  id: null,
  title: "",
  category: "sop",
  summary: "",
  fullText: "",
  tags: "",
}

export function MemoryBankManager({ entries }: { entries: MemoryEntryRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT)

  const filtered = entries.filter((e) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      e.title.toLowerCase().includes(q) ||
      (e.summary ?? "").toLowerCase().includes(q) ||
      (e.tags ?? []).some((t) => t.toLowerCase().includes(q))
    )
  })

  function openCreate() {
    setDraft(EMPTY_DRAFT)
    setDialogOpen(true)
  }

  function openEdit(entry: MemoryEntryRow) {
    setDraft({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      summary: entry.summary ?? "",
      fullText: entry.fullText,
      tags: (entry.tags ?? []).join(", "),
    })
    setDialogOpen(true)
  }

  function save() {
    if (!draft.title.trim() || !draft.fullText.trim()) {
      toast.error("Title and content are required")
      return
    }
    const tags = draft.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    startTransition(async () => {
      try {
        if (draft.id) {
          await updateMemoryEntry(draft.id, {
            title: draft.title,
            category: draft.category,
            summary: draft.summary || undefined,
            fullText: draft.fullText,
            tags,
          })
          toast.success("Entry updated")
        } else {
          await createMemoryEntry({
            title: draft.title,
            category: draft.category,
            summary: draft.summary || undefined,
            fullText: draft.fullText,
            tags,
            source: "manual",
            aiEnabled: true,
          })
          toast.success("Entry added to the Memory Bank")
        }
        setDialogOpen(false)
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save entry")
      }
    })
  }

  function toggleAi(entry: MemoryEntryRow, value: boolean) {
    startTransition(async () => {
      try {
        await setMemoryAiEnabled(entry.id, value)
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update")
      }
    })
  }

  function toggleArchive(entry: MemoryEntryRow) {
    const next = entry.status === "archived" ? "active" : "archived"
    startTransition(async () => {
      try {
        await setMemoryStatus(entry.id, next)
        toast.success(next === "archived" ? "Entry archived" : "Entry restored")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search knowledge..."
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" />
          Add entry
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <BrainCircuit className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No knowledge entries yet. Add SOPs, policies, or custom AI knowledge to ground the
            assistant.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <Card key={entry.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{entry.title}</h3>
                    <Badge variant="secondary">{categoryLabel(entry.category)}</Badge>
                    {entry.status === "archived" && (
                      <Badge className="border-transparent bg-gray-200 text-gray-700">Archived</Badge>
                    )}
                  </div>
                  {entry.summary ? (
                    <p className="mt-1 text-sm text-muted-foreground">{entry.summary}</p>
                  ) : null}
                  {(entry.tags ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(entry.tags ?? []).map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(entry)} aria-label="Edit entry">
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleArchive(entry)}
                    aria-label={entry.status === "archived" ? "Restore entry" : "Archive entry"}
                  >
                    {entry.status === "archived" ? (
                      <ArchiveRestore className="size-4" />
                    ) : (
                      <Archive className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-border pt-3">
                <Sparkles className="size-4 text-primary" />
                <Label htmlFor={`ai-${entry.id}`} className="flex-1 text-sm">
                  Available to AI assistant
                </Label>
                <Switch
                  id={`ai-${entry.id}`}
                  checked={entry.aiEnabled}
                  onCheckedChange={(v) => toggleAi(entry, v)}
                  disabled={pending}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit knowledge entry" : "Add knowledge entry"}</DialogTitle>
            <DialogDescription>
              Internal knowledge the AI can draw on. Use clear titles and summaries for best
              retrieval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-title">Title</Label>
              <Input
                id="m-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. Discovery request handling procedure"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-category">Category</Label>
              <Select
                value={draft.category}
                onValueChange={(v) => setDraft({ ...draft, category: v ?? "sop" })}
              >
                <SelectTrigger id="m-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-summary">Summary (optional)</Label>
              <Textarea
                id="m-summary"
                value={draft.summary}
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                rows={2}
                placeholder="One or two sentences describing this entry."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-body">Content</Label>
              <Textarea
                id="m-body"
                value={draft.fullText}
                onChange={(e) => setDraft({ ...draft, fullText: e.target.value })}
                rows={8}
                placeholder="Paste the full procedure, policy, or knowledge here."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-tags">Tags (comma separated)</Label>
              <Input
                id="m-tags"
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                placeholder="discovery, deadlines, intake"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {draft.id ? "Save changes" : "Add entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
