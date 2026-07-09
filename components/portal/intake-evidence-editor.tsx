"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { INTAKE_EVIDENCE_TYPES } from "@/lib/constants"
import { addIntakeEvidence } from "@/app/actions/portal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function IntakeEvidenceEditor({ intakeId }: { intakeId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [title, setTitle] = useState("")
  const [type, setType] = useState("google_docs")
  const [url, setUrl] = useState("")

  function add() {
    if (!title.trim() || !url.trim()) {
      toast.error("Add a title and link")
      return
    }
    start(async () => {
      const res = await addIntakeEvidence(intakeId, {
        id: crypto.randomUUID(),
        type,
        title: title.trim(),
        url: url.trim(),
      })
      if (!res.ok) {
        toast.error(res.error ?? "Could not add evidence")
        return
      }
      toast.success("Evidence added")
      setTitle("")
      setUrl("")
      setType("google_docs")
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5 self-start" onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Add Evidence
      </Button>
    )
  }

  return (
    <div className="grid gap-3 rounded-lg border border-dashed border-border p-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="add-ev-title">Title</Label>
        <Input id="add-ev-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="add-ev-type">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v ?? "google_docs")}>
          <SelectTrigger id="add-ev-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTAKE_EVIDENCE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="add-ev-url">Link</Label>
        <Input
          id="add-ev-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://drive.google.com/..."
        />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button size="sm" onClick={add} disabled={pending}>
          {pending ? "Adding..." : "Add"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
