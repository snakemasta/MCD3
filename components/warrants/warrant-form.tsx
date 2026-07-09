"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X, Save, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { createWarrant, updateWarrant, submitWarrant, type WarrantInput } from "@/app/actions/warrants"
import { computeChecklist, checklistCompletion, type EvidenceLink } from "@/lib/warrant-utils"
import { EvidenceLinksEditor } from "@/components/warrants/evidence-links-editor"

interface TypeOption {
  value: string
  label: string
}

interface PoliceReportOption {
  id: string
  label: string
}

export interface WarrantFormInitial extends Partial<WarrantInput> {
  id?: string
}

export function WarrantForm({
  mode,
  initial,
  warrantTypes,
  riskLevels,
  policeReports,
  officerName,
}: {
  mode: "create" | "edit"
  initial?: WarrantFormInitial
  warrantTypes: TypeOption[]
  riskLevels: TypeOption[]
  policeReports: PoliceReportOption[]
  officerName: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [action, setAction] = useState<"draft" | "submit" | null>(null)

  const [form, setForm] = useState<WarrantInput>({
    title: initial?.title ?? "",
    warrantType: initial?.warrantType ?? "arrest",
    suspectName: initial?.suspectName ?? "",
    dateOfBirth: initial?.dateOfBirth ?? "",
    agency: initial?.agency ?? "",
    requestedCharges: initial?.requestedCharges ?? "",
    probableCause: initial?.probableCause ?? "",
    incidentSummary: initial?.incidentSummary ?? "",
    incidentDate: initial?.incidentDate ?? "",
    location: initial?.location ?? "",
    itemsSought: initial?.itemsSought ?? "",
    riskLevel: initial?.riskLevel ?? "medium",
    evidenceLinks: initial?.evidenceLinks ?? [],
    evidenceSummaries: initial?.evidenceSummaries ?? "",
    relatedPoliceReportId: initial?.relatedPoliceReportId ?? null,
    notesToJudge: initial?.notesToJudge ?? "",
  })

  function set<K extends keyof WarrantInput>(key: K, value: WarrantInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const checklist = useMemo(
    () =>
      computeChecklist({
        ...form,
        requestingOfficerName: officerName,
        incidentDate: form.incidentDate || null,
        evidenceLinks: form.evidenceLinks ?? [],
      }),
    [form, officerName],
  )
  const pct = checklistCompletion(checklist, "all")

  function save(submit: boolean) {
    if (!form.title.trim()) {
      toast.error("A warrant title is required")
      return
    }
    setAction(submit ? "submit" : "draft")
    startTransition(async () => {
      try {
        if (mode === "create") {
          const { id } = await createWarrant(form, submit)
          toast.success(submit ? "Warrant submitted for review" : "Draft saved")
          router.push(`/le/warrant/${id}`)
          router.refresh()
        } else if (initial?.id) {
          await updateWarrant(initial.id, form)
          if (submit) await submitWarrant(initial.id)
          toast.success(submit ? "Warrant submitted for review" : "Changes saved")
          router.push(`/le/warrant/${initial.id}`)
          router.refresh()
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong")
      } finally {
        setAction(null)
      }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form
        className="space-y-6 lg:col-span-2"
        onSubmit={(e) => {
          e.preventDefault()
          save(true)
        }}
      >
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Warrant Details</h2>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Warrant Title *</label>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g., Arrest warrant for John Doe — Aggravated Assault"
                className="mt-1"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Warrant Type</label>
                <Select value={form.warrantType} onValueChange={(v) => set("warrantType", v ?? "")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {warrantTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Risk Level</label>
                <Select value={form.riskLevel} onValueChange={(v) => set("riskLevel", v ?? "")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {riskLevels.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Suspect / Defendant</h2>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Suspect / Defendant Name</label>
                <Input
                  value={form.suspectName}
                  onChange={(e) => set("suspectName", e.target.value)}
                  placeholder="Full name if known"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Date of Birth</label>
                <Input
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                  placeholder="MM/DD/YYYY"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Requested Charges</label>
              <Input
                value={form.requestedCharges}
                onChange={(e) => set("requestedCharges", e.target.value)}
                placeholder="Comma-separated, e.g., 18 U.S.C. § 1001, State Statute XYZ"
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Probable Cause & Incident</h2>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Probable Cause Statement</label>
              <Textarea
                value={form.probableCause}
                onChange={(e) => set("probableCause", e.target.value)}
                placeholder="Facts establishing probable cause, including the nexus between the suspect, location, items sought, and the alleged offense..."
                className="mt-1 min-h-32"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Incident Summary</label>
              <Textarea
                value={form.incidentSummary}
                onChange={(e) => set("incidentSummary", e.target.value)}
                placeholder="Factual summary of the incident..."
                className="mt-1 min-h-24"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Incident Date / Time</label>
                <Input
                  type="datetime-local"
                  value={form.incidentDate ?? ""}
                  onChange={(e) => set("incidentDate", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Agency</label>
                <Input
                  value={form.agency}
                  onChange={(e) => set("agency", e.target.value)}
                  placeholder="Requesting agency"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Location to Search or Arrest</label>
              <Input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Address or place to be searched / where arrest will occur"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Items or Persons Sought</label>
              <Textarea
                value={form.itemsSought}
                onChange={(e) => set("itemsSought", e.target.value)}
                placeholder="Describe the items, evidence, or persons sought..."
                className="mt-1 min-h-20"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-1 text-lg font-semibold">Supporting Evidence</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Add links to supporting evidence and summarize what each shows.
          </p>
          <div className="grid gap-4">
            <EvidenceLinksEditor
              links={form.evidenceLinks ?? []}
              onChange={(links: EvidenceLink[]) => set("evidenceLinks", links)}
            />
            <div>
              <label className="text-sm font-medium">Evidence Summaries</label>
              <Textarea
                value={form.evidenceSummaries}
                onChange={(e) => set("evidenceSummaries", e.target.value)}
                placeholder="Summarize the evidence and its relevance..."
                className="mt-1 min-h-20"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Related Police Report</label>
              <Select
                value={form.relatedPoliceReportId ?? "none"}
                onValueChange={(v) => set("relatedPoliceReportId", v === "none" ? null : v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Link a police report" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {policeReports.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notes to Judge</label>
              <Textarea
                value={form.notesToJudge}
                onChange={(e) => set("notesToJudge", e.target.value)}
                placeholder="Anything else the reviewing judge should know..."
                className="mt-1 min-h-20"
              />
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending}>
            <Send className="size-4" />
            {pending && action === "submit" ? "Submitting…" : "Submit for Review"}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={() => save(false)}>
            <Save className="size-4" />
            {pending && action === "draft" ? "Saving…" : "Save Draft"}
          </Button>
        </div>
      </form>

      <div className="lg:col-span-1">
        <Card className="sticky top-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Completeness</h2>
            <span className="text-sm font-medium tabular-nums text-muted-foreground">{pct}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <ul className="mt-4 space-y-2">
            {checklist.map((item) => (
              <li key={item.key} className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full",
                    item.done ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.done ? <Check className="size-2.5" /> : <X className="size-2.5" />}
                </span>
                <span className={cn(item.done ? "text-foreground" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Save a draft to run the AI review and get probable-cause suggestions.
          </p>
        </Card>
      </div>
    </div>
  )
}
