"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { INTAKE_EVIDENCE_TYPES } from "@/lib/constants"
import { addCivilianCaseEvidence } from "@/app/actions/portal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function CaseEvidenceEditor({ caseId }: { caseId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [title, setTitle] = useState("")
  const [evidenceType, setEvidenceType] = useState("google_docs")
  const [link, setLink] = useState("")
  const [description, setDescription] = useState("")

  function submit() {
    if (!title.trim() || !link.trim()) {
      toast.error("Add a title and link")
      return
    }
    start(async () => {
      const res = await addCivilianCaseEvidence({
        caseId,
        title: title.trim(),
        evidenceType,
        link: link.trim(),
        description: description.trim() || undefined,
      })
      if (!res.ok) {
        toast.error(res.error ?? "Could not add evidence")
        return
      }
      toast.success("Evidence submitted for review")
      setTitle("")
      setLink("")
      setDescription("")
      setEvidenceType("google_docs")
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5 self-start" onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Submit Evidence
      </Button>
    )
  }

  return (
    <div className="grid gap-3 rounded-lg border border-dashed border-border p-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ce-title">Title</Label>
        <Input id="ce-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ce-type">Type</Label>
        <Select value={evidenceType} onValueChange={(v) => setEvidenceType(v ?? "google_docs")}>
          <SelectTrigger id="ce-type">
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
        <Label htmlFor="ce-link">Link</Label>
        <Input
          id="ce-link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://drive.google.com/..."
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="ce-desc">Description (optional)</Label>
        <Textarea
          id="ce-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? "Submitting..." : "Submit"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
