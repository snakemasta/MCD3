"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, FileText, Lock } from "lucide-react"
import { toast } from "sonner"
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type TemplateRow,
} from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel } from "@/components/ui/field"

const CATEGORIES = [
  { value: "motion", label: "Motion" },
  { value: "letter", label: "Letter" },
  { value: "filing", label: "Filing" },
  { value: "notice", label: "Notice" },
  { value: "other", label: "Other" },
]

interface DraftState {
  id?: string
  name: string
  category: string
  description: string
  content: string
}

const EMPTY: DraftState = {
  name: "",
  category: "motion",
  description: "",
  content: "",
}

export function TemplatesManager({
  initialTemplates,
}: {
  initialTemplates: TemplateRow[]
}) {
  const router = useRouter()
  const [templates, setTemplates] = useState(initialTemplates)
  const [editing, setEditing] = useState<DraftState | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    if (!editing) return
    const draft = editing
    startTransition(async () => {
      try {
        if (draft.id) {
          await updateTemplate({
            id: draft.id,
            name: draft.name,
            category: draft.category,
            description: draft.description,
            content: draft.content,
          })
          setTemplates((prev) =>
            prev.map((t) =>
              t.id === draft.id
                ? {
                    ...t,
                    name: draft.name,
                    category: draft.category,
                    description: draft.description || null,
                    content: draft.content,
                  }
                : t,
            ),
          )
          toast.success("Template updated")
        } else {
          await createTemplate({
            name: draft.name,
            category: draft.category,
            description: draft.description,
            content: draft.content,
          })
          toast.success("Template created")
          router.refresh()
        }
        setEditing(null)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save template")
      }
    })
  }

  function toggleActive(t: TemplateRow, active: boolean) {
    startTransition(async () => {
      try {
        await updateTemplate({ id: t.id, active })
        setTemplates((prev) =>
          prev.map((x) => (x.id === t.id ? { ...x, active } : x)),
        )
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update")
      }
    })
  }

  function confirmDelete() {
    if (!deleteId) return
    const id = deleteId
    startTransition(async () => {
      try {
        await deleteTemplate(id)
        setTemplates((prev) => prev.filter((t) => t.id !== id))
        toast.success("Template deleted")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete")
      } finally {
        setDeleteId(null)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="size-4" />
          New template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No templates yet. Create one to power AI drafting.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex flex-col gap-3 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{t.name}</p>
                      {t.isSystem && (
                        <Lock className="size-3 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    {t.description && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {t.category}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch
                      checked={t.active}
                      onCheckedChange={(c) => toggleActive(t, c)}
                    />
                    {t.active ? "Active" : "Inactive"}
                  </label>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setEditing({
                          id: t.id,
                          name: t.name,
                          category: t.category,
                          description: t.description ?? "",
                          content: t.content,
                        })
                      }
                    >
                      <Pencil className="size-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    {!t.isSystem && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(t.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit template" : "New template"}
            </DialogTitle>
            <DialogDescription>
              Templates can be referenced when generating drafts and motions.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  placeholder="e.g. Motion to Suppress Evidence"
                />
              </Field>
              <Field>
                <FieldLabel>Category</FieldLabel>
                <Select
                  value={editing.category}
                  onValueChange={(v) => setEditing({ ...editing, category: (v as string) ?? "motion" })}
                >
                  <SelectTrigger>
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
              </Field>
              <Field>
                <FieldLabel>Description</FieldLabel>
                <Input
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  placeholder="Short summary of when to use this template"
                />
              </Field>
              <Field>
                <FieldLabel>Template content</FieldLabel>
                <Textarea
                  rows={10}
                  value={editing.content}
                  onChange={(e) =>
                    setEditing({ ...editing, content: e.target.value })
                  }
                  placeholder="Body of the template. Use placeholders like [CLIENT NAME], [COURT], [CASE NUMBER]."
                  className="font-mono text-sm"
                />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending || !editing?.name.trim()}>
              {pending ? "Saving…" : "Save template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
