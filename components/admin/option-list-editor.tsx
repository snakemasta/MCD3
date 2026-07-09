"use client"

import { useState, useTransition } from "react"
import { GripVertical, Plus, Trash2, Pencil, Check, X } from "lucide-react"
import { toast } from "sonner"
import {
  addOption,
  updateOption,
  deleteOption,
  reorderOptions,
} from "@/app/actions/admin"
import type { OptionRow } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

interface OptionListEditorProps {
  category: string
  label: string
  description: string
  initialOptions: OptionRow[]
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export function OptionListEditor({
  category,
  label,
  description,
  initialOptions,
}: OptionListEditorProps) {
  const [options, setOptions] = useState<OptionRow[]>(initialOptions)
  const [newLabel, setNewLabel] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [pending, startTransition] = useTransition()

  function refresh(next: OptionRow[]) {
    setOptions(next.sort((a, b) => a.sortOrder - b.sortOrder))
  }

  function handleAdd() {
    const trimmed = newLabel.trim()
    if (!trimmed) return
    const value = slugify(trimmed)
    if (options.some((o) => o.value === value)) {
      toast.error("That value already exists in this list")
      return
    }
    startTransition(async () => {
      try {
        const created = await addOption({ category, value, label: trimmed })
        refresh([...options, created])
        setNewLabel("")
        toast.success(`Added "${trimmed}"`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to add option")
      }
    })
  }

  function handleSaveEdit(id: string) {
    const trimmed = editLabel.trim()
    if (!trimmed) return
    startTransition(async () => {
      try {
        await updateOption({ id, label: trimmed })
        refresh(options.map((o) => (o.id === id ? { ...o, label: trimmed } : o)))
        setEditingId(null)
        toast.success("Updated")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update")
      }
    })
  }

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      try {
        await updateOption({ id, active })
        refresh(options.map((o) => (o.id === id ? { ...o, active } : o)))
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update")
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteOption(id)
        refresh(options.filter((o) => o.id !== id))
        toast.success("Removed")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to remove")
      }
    })
  }

  function handleMove(id: string, direction: "up" | "down") {
    const index = options.findIndex((o) => o.id === id)
    if (index < 0) return
    const swapWith = direction === "up" ? index - 1 : index + 1
    if (swapWith < 0 || swapWith >= options.length) return
    const reordered = [...options]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(swapWith, 0, moved)
    const withOrder = reordered.map((o, i) => ({ ...o, sortOrder: i }))
    refresh(withOrder)
    startTransition(async () => {
      try {
        await reorderOptions(withOrder.map((o) => o.id))
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to reorder")
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{label}</h3>
          <Badge variant="secondary" className="text-xs">
            {options.length}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>

      <ul className="divide-y divide-border">
        {options.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            No options yet. Add one below.
          </li>
        )}
        {options.map((opt, i) => (
          <li key={opt.id} className="flex items-center gap-2 px-4 py-2.5">
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => handleMove(opt.id, "up")}
                disabled={i === 0 || pending}
                className="text-muted-foreground/60 hover:text-foreground disabled:opacity-30"
                aria-label="Move up"
              >
                <GripVertical className="size-4" />
              </button>
            </div>

            {editingId === opt.id ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit(opt.id)
                    if (e.key === "Escape") setEditingId(null)
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => handleSaveEdit(opt.id)}
                  disabled={pending}
                  aria-label="Save"
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => setEditingId(null)}
                  aria-label="Cancel"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {opt.value}
                  </span>
                </div>
                <Switch
                  checked={opt.active}
                  onCheckedChange={(v) => handleToggle(opt.id, v)}
                  disabled={pending}
                  aria-label={`Toggle ${opt.label}`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => {
                    setEditingId(opt.id)
                    setEditLabel(opt.label)
                  }}
                  aria-label="Edit"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(opt.id)}
                  disabled={pending}
                  aria-label="Delete"
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={`Add ${label.toLowerCase().replace(/s$/, "")}…`}
          className="h-9"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleAdd()
            }
          }}
        />
        <Button onClick={handleAdd} disabled={pending || !newLabel.trim()} size="sm">
          <Plus className="size-4" />
          Add
        </Button>
      </div>
    </div>
  )
}
