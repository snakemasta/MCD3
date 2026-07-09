"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { EvidenceLink } from "@/lib/warrant-utils"

export function EvidenceLinksEditor({
  links,
  onChange,
}: {
  links: EvidenceLink[]
  onChange: (links: EvidenceLink[]) => void
}) {
  function update(i: number, patch: Partial<EvidenceLink>) {
    onChange(links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function add() {
    onChange([...links, { label: "", url: "" }])
  }
  function remove(i: number) {
    onChange(links.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-3">
      {links.length === 0 && (
        <p className="text-sm text-muted-foreground">No evidence links added yet.</p>
      )}
      {links.map((link, i) => (
        <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={link.label}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder="Label (e.g., Bodycam footage)"
            className="sm:w-1/3"
            aria-label={`Evidence link ${i + 1} label`}
          />
          <Input
            value={link.url}
            onChange={(e) => update(i, { url: e.target.value })}
            placeholder="https://..."
            className="flex-1"
            aria-label={`Evidence link ${i + 1} URL`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
            aria-label="Remove link"
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="size-4" />
        Add evidence link
      </Button>
    </div>
  )
}
