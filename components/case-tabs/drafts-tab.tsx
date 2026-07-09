"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, PenLine, Sparkles, Save, ArrowLeft } from "lucide-react"
import type { Role } from "@/lib/constants"
import { can, DRAFT_TYPES, itemsOf, labelOf } from "@/lib/constants"
import {
  createDraft,
  updateDraft,
  deleteDraft,
} from "@/app/actions/drafts"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Markdown } from "@/components/markdown"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface DraftsTabProps {
  role: Role
  caseId: string
  drafts: Record<string, unknown>[]
}

export function DraftsTab({ role, caseId, drafts }: DraftsTabProps) {
  const router = useRouter()
  const canManage = can(role, "draft:manage")

  const [open, setOpen] = useState(false)
  const [docType, setDocType] = useState("motion")
  const [instructions, setInstructions] = useState("")
  const [generating, setGenerating] = useState(false)

  // Editor state for an open draft.
  const [editing, setEditing] = useState<{
    id: string | null
    title: string
    type: string
    content: string
  } | null>(null)
  const [saving, setSaving] = useState(false)

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch("/api/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, docType, instructions: instructions.trim() || undefined }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Generation failed")
      }
      const data = (await res.json()) as { content: string }
      setOpen(false)
      setInstructions("")
      setEditing({
        id: null,
        title: `${labelOf(DRAFT_TYPES, docType)} — Draft`,
        type: docType,
        content: data.content,
      })
      toast.success("Draft generated. Review and save.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed.")
    } finally {
      setGenerating(false)
    }
  }

  async function save() {
    if (!editing) return
    if (!editing.title.trim()) {
      toast.error("Title is required.")
      return
    }
    setSaving(true)
    try {
      if (editing.id) {
        await updateDraft(editing.id, caseId, {
          title: editing.title,
          type: editing.type,
          content: editing.content,
        })
      } else {
        await createDraft({
          caseId,
          title: editing.title,
          type: editing.type,
          content: editing.content,
        })
      }
      toast.success("Draft saved.")
      setEditing(null)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  // --- Editor view ---------------------------------------------------------
  if (editing) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground"
            onClick={() => setEditing(null)}
          >
            <ArrowLeft data-icon="inline-start" />
            Back to drafts
          </Button>
          {canManage && (
            <Button onClick={save} disabled={saving}>
              {saving ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
              {saving ? "Saving..." : "Save Draft"}
            </Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <Input
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            placeholder="Document title"
          />
          <Select
            items={itemsOf(DRAFT_TYPES)}
            value={editing.type}
            onValueChange={(v) => setEditing({ ...editing, type: v ?? editing.type })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {DRAFT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Textarea
            value={editing.content}
            onChange={(e) => setEditing({ ...editing, content: e.target.value })}
            rows={24}
            className="font-mono text-sm"
          />
          <Card className="overflow-hidden">
            <CardContent className="max-h-[40rem] overflow-y-auto pt-5 text-sm">
              <Markdown content={editing.content || "_Nothing to preview yet._"} />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // --- List view -----------------------------------------------------------
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Motions &amp; Drafts</h2>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setEditing({ id: null, title: "", type: "motion", content: "" })
              }
            >
              <Plus data-icon="inline-start" />
              Blank
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <Sparkles data-icon="inline-start" />
                AI Draft
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate a Draft</DialogTitle>
                </DialogHeader>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="g-type">Document Type</FieldLabel>
                    <Select items={itemsOf(DRAFT_TYPES)} value={docType} onValueChange={(v) => setDocType(v ?? "motion")}>
                      <SelectTrigger id="g-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {DRAFT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="g-instr">
                      Specific Instructions (optional)
                    </FieldLabel>
                    <Textarea
                      id="g-instr"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="e.g. Focus on the illegal search and lack of a warrant."
                      rows={3}
                    />
                  </Field>
                </FieldGroup>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button onClick={generate} disabled={generating}>
                    {generating ? <Spinner data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}
                    {generating ? "Generating..." : "Generate"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {drafts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PenLine />
            </EmptyMedia>
            <EmptyTitle>No drafts yet</EmptyTitle>
            <EmptyDescription>
              Generate motions, briefs, and memos with AI, then edit and save
              them here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {drafts.map((d) => {
            const id = d.id as string
            return (
              <Card key={id} className="transition-colors hover:bg-accent/30">
                <CardContent className="flex items-start justify-between gap-3 pt-5">
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() =>
                      setEditing({
                        id,
                        title: d.title as string,
                        type: d.type as string,
                        content: d.content as string,
                      })
                    }
                  >
                    <p className="truncate font-medium">{d.title as string}</p>
                    <p className="text-xs text-muted-foreground">
                      {labelOf(DRAFT_TYPES, d.type as string)} ·{" "}
                      {new Date(d.updatedAt as string).toLocaleDateString()}
                    </p>
                  </button>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={async () => {
                        await deleteDraft(id, caseId)
                        router.refresh()
                      }}
                    >
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
