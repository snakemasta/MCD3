"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, Link2 } from "lucide-react"
import type { ResolvedField } from "@/lib/intake-config"
import type { IntakeEvidenceLink } from "@/lib/portal"
import { INTAKE_EVIDENCE_TYPES, labelOf } from "@/lib/constants"
import { submitIntake } from "@/app/actions/portal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  type: string
  typeLabel: string
  fields: ResolvedField[]
  urgencyLevels: { value: string; label: string }[]
  defaults: { fullName: string; email: string }
}

export function IntakeForm({ type, typeLabel, fields, urgencyLevels, defaults }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [values, setValues] = useState<Record<string, string>>({
    fullName: defaults.fullName,
    email: defaults.email,
  })
  const [urgency, setUrgency] = useState("normal")
  const [evidence, setEvidence] = useState<IntakeEvidenceLink[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Draft evidence row
  const [evTitle, setEvTitle] = useState("")
  const [evType, setEvType] = useState("google_docs")
  const [evUrl, setEvUrl] = useState("")
  const [evSummary, setEvSummary] = useState("")

  function set(key: string, value: string | null) {
    setValues((v) => ({ ...v, [key]: value ?? "" }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }))
  }

  function addEvidence() {
    const title = evTitle.trim()
    const url = evUrl.trim()
    if (!title || !url) {
      toast.error("Add a title and link for the evidence")
      return
    }
    setEvidence((list) => [
      ...list,
      { id: crypto.randomUUID(), type: evType, title, url, summary: evSummary.trim() || undefined },
    ])
    setEvTitle("")
    setEvUrl("")
    setEvSummary("")
    setEvType("google_docs")
  }

  function removeEvidence(id: string) {
    setEvidence((list) => list.filter((e) => e.id !== id))
  }

  function submit() {
    start(async () => {
      const res = await submitIntake({ type, urgency, values, evidence })
      if (!res.ok) {
        if (res.errors) {
          setErrors(res.errors)
          toast.error("Please complete the required fields")
        } else {
          toast.error(res.error ?? "Could not submit your request")
        }
        return
      }
      toast.success("Your request has been submitted")
      router.push(`/portal/requests/${res.id}`)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{typeLabel} — Your Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => {
            const isWide = field.kind === "textarea"
            return (
              <div
                key={field.key}
                className={isWide ? "sm:col-span-2 flex flex-col gap-1.5" : "flex flex-col gap-1.5"}
              >
                <Label htmlFor={field.key}>
                  {field.label}
                  {field.required && <span className="ml-0.5 text-destructive">*</span>}
                </Label>
                {field.kind === "textarea" ? (
                  <Textarea
                    id={field.key}
                    value={values[field.key] ?? ""}
                    onChange={(e) => set(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                    aria-invalid={!!errors[field.key]}
                  />
                ) : field.kind === "select" ? (
                  <Select
                    value={values[field.key] ?? ""}
                    onValueChange={(v) => set(field.key, v)}
                  >
                    <SelectTrigger id={field.key} aria-invalid={!!errors[field.key]}>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field.key}
                    type={field.kind === "date" ? "date" : field.kind === "tel" ? "tel" : field.kind === "email" ? "email" : "text"}
                    value={values[field.key] ?? ""}
                    onChange={(e) => set(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    aria-invalid={!!errors[field.key]}
                  />
                )}
                {field.help && !errors[field.key] && (
                  <p className="text-xs text-muted-foreground">{field.help}</p>
                )}
                {errors[field.key] && (
                  <p className="text-xs text-destructive">{errors[field.key]}</p>
                )}
              </div>
            )
          })}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="urgency">How urgent is this?</Label>
            <Select value={urgency} onValueChange={(v) => setUrgency(v ?? "normal")}>
              <SelectTrigger id="urgency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {urgencyLevels.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supporting Evidence (optional)</CardTitle>
          <p className="text-sm text-muted-foreground text-pretty">
            Share links to documents, photos, or videos. Use Google Drive, Google Docs, or any
            shareable link. Do not paste sensitive passwords.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {evidence.length > 0 && (
            <ul className="flex flex-col gap-2">
              {evidence.map((e) => (
                <li
                  key={e.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{e.url}</p>
                      <p className="text-xs text-muted-foreground">
                        {labelOf(INTAKE_EVIDENCE_TYPES, e.type)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeEvidence(e.id)}
                    aria-label="Remove evidence"
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-3 rounded-lg border border-dashed border-border p-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-title">Title</Label>
              <Input
                id="ev-title"
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
                placeholder="e.g., Signed lease agreement"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-type">Type</Label>
              <Select value={evType} onValueChange={(v) => setEvType(v ?? "google_docs")}>
                <SelectTrigger id="ev-type">
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
              <Label htmlFor="ev-url">Link</Label>
              <Input
                id="ev-url"
                value={evUrl}
                onChange={(e) => setEvUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="ev-summary">What is this? (optional)</Label>
              <Textarea
                id="ev-summary"
                value={evSummary}
                onChange={(e) => setEvSummary(e.target.value)}
                rows={2}
                placeholder="Briefly describe what this evidence shows"
              />
            </div>
            <div className="sm:col-span-2">
              <Button variant="outline" size="sm" onClick={addEvidence} className="gap-1.5">
                <Plus data-icon="inline-start" />
                Add Evidence
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" nativeButton={false} render={<a href="/portal/new" />}>
          Back
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Submitting..." : "Submit Request"}
        </Button>
      </div>
    </div>
  )
}
