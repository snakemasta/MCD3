"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, FolderSearch, ExternalLink, ShieldCheck } from "lucide-react"
import type { Role } from "@/lib/constants"
import {
  can,
  EVIDENCE_TYPES,
  EVIDENCE_STATUSES,
  itemsOf,
  labelOf,
} from "@/lib/constants"
import {
  addEvidence,
  updateEvidence,
  deleteEvidence,
} from "@/app/actions/evidence"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { EvidenceStatusBadge } from "@/components/case-badges"
import { Badge } from "@/components/ui/badge"
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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface ExternalLinkItem {
  label: string
  url: string
  kind?: string
}

interface EvidenceTabProps {
  role: Role
  caseId: string
  evidence: Record<string, unknown>[]
}

export function EvidenceTab({ role, caseId, evidence }: EvidenceTabProps) {
  const router = useRouter()
  const canManage = can(role, "evidence:manage")
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [evidenceType, setEvidenceType] = useState("document")
  const [link, setLink] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  async function add() {
    if (!title.trim()) {
      toast.error("Title is required.")
      return
    }
    setSaving(true)
    try {
      await addEvidence({
        caseId,
        title: title.trim(),
        evidenceType,
        link: link.trim() || undefined,
        description: description.trim() || undefined,
      })
      setTitle("")
      setLink("")
      setDescription("")
      setOpen(false)
      toast.success("Evidence added.")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add evidence.")
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(id: string, status: string) {
    try {
      await updateEvidence(id, caseId, { status })
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update.")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Evidence Locker</h2>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus data-icon="inline-start" />
              Add Evidence
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Evidence</DialogTitle>
              </DialogHeader>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="e-title">Title</FieldLabel>
                  <Input
                    id="e-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Body cam footage – Officer Reyes"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="e-type">Type</FieldLabel>
                  <Select items={itemsOf(EVIDENCE_TYPES)} value={evidenceType} onValueChange={(v) => setEvidenceType(v ?? "document")}>
                    <SelectTrigger id="e-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {EVIDENCE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="e-link">Link (optional)</FieldLabel>
                  <Input
                    id="e-link"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://..."
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="e-desc">Description</FieldLabel>
                  <Textarea
                    id="e-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button onClick={add} disabled={saving}>
                  {saving ? "Adding..." : "Add Evidence"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {evidence.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderSearch />
            </EmptyMedia>
            <EmptyTitle>No evidence yet</EmptyTitle>
            <EmptyDescription>
              Track documents, photos, witness statements, and more.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {evidence.map((e) => {
            const id = e.id as string
            return (
              <Card key={id}>
                <CardContent className="flex flex-col gap-2 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{e.title as string}</p>
                      <p className="text-xs text-muted-foreground">
                        {labelOf(EVIDENCE_TYPES, e.evidenceType as string)}
                      </p>
                    </div>
                    <EvidenceStatusBadge status={e.status as string} />
                  </div>
                  {e.source === "police_report" && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <ShieldCheck className="size-3" />
                        From police report
                      </Badge>
                      {e.policeReportId ? (
                        <Link
                          href={`/reports/${e.policeReportId as string}`}
                          className="text-xs text-primary hover:underline"
                        >
                          View report
                        </Link>
                      ) : null}
                    </div>
                  )}
                  {e.description ? (
                    <p className="text-sm text-muted-foreground">
                      {e.description as string}
                    </p>
                  ) : null}
                  {e.summary ? (
                    <p className="rounded-lg border border-primary/20 bg-primary/5 p-2 text-xs text-muted-foreground">
                      {e.summary as string}
                    </p>
                  ) : null}
                  {Array.isArray(e.externalLinks) &&
                  (e.externalLinks as ExternalLinkItem[]).length > 0 ? (
                    <div className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Attached from report
                      </p>
                      {(e.externalLinks as ExternalLinkItem[]).map((l, i) => (
                        <a
                          key={i}
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="size-3" />
                          {l.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    {e.link ? (
                      <a
                        href={e.link as string}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" />
                        Open link
                      </a>
                    ) : (
                      <span />
                    )}
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Select
                          items={itemsOf(EVIDENCE_STATUSES)}
                          value={e.status as string}
                          onValueChange={(v) => changeStatus(id, v ?? (e.status as string))}
                        >
                          <SelectTrigger size="sm" className="h-7 w-36 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {EVIDENCE_STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={async () => {
                            await deleteEvidence(id, caseId)
                            router.refresh()
                          }}
                        >
                          <Trash2 className="text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
