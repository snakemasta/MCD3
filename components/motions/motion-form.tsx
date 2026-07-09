"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X, Save, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { createMotion, updateMotion, fileMotion, type MotionInput } from "@/app/actions/motions"
import {
  computeMotionChecklist,
  motionChecklistCompletion,
  type EvidenceLink,
} from "@/lib/motion-utils"
import { EvidenceLinksEditor } from "@/components/warrants/evidence-links-editor"

interface Option {
  value: string
  label: string
}

interface CaseOption {
  id: string
  label: string
}

export interface MotionFormInitial extends Partial<MotionInput> {
  id?: string
}

export function MotionForm({
  mode,
  initial,
  motionTypes,
  urgencyLevels,
  cases,
  lockedCaseId,
  basePath = "/motions",
}: {
  mode: "create" | "edit"
  initial?: MotionFormInitial
  motionTypes: Option[]
  urgencyLevels: Option[]
  cases: CaseOption[]
  /** When set, the case is fixed (e.g. filing from within a case). */
  lockedCaseId?: string
  /** Where to navigate after save. */
  basePath?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [action, setAction] = useState<"draft" | "file" | null>(null)

  const [form, setForm] = useState<MotionInput>({
    caseId: initial?.caseId ?? lockedCaseId ?? (cases[0]?.id ?? ""),
    title: initial?.title ?? "",
    motionType: initial?.motionType ?? "other",
    relief: initial?.relief ?? "",
    argument: initial?.argument ?? "",
    factualBasis: initial?.factualBasis ?? "",
    authoritiesCited: initial?.authoritiesCited ?? "",
    evidenceLinks: initial?.evidenceLinks ?? [],
    hearingRequested: initial?.hearingRequested ?? false,
    urgency: initial?.urgency ?? "normal",
  })

  function set<K extends keyof MotionInput>(key: K, value: MotionInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const checklist = useMemo(
    () => computeMotionChecklist({ ...form, evidenceLinks: form.evidenceLinks ?? [] }),
    [form],
  )
  const pct = motionChecklistCompletion(checklist, "all")

  function save(file: boolean) {
    if (!form.title.trim()) {
      toast.error("A motion title is required")
      return
    }
    if (!form.caseId) {
      toast.error("Select a case for this motion")
      return
    }
    setAction(file ? "file" : "draft")
    startTransition(async () => {
      try {
        if (mode === "create") {
          const { id } = await createMotion(form, file)
          toast.success(file ? "Motion filed" : "Draft saved")
          router.push(`${basePath}/${id}`)
          router.refresh()
        } else if (initial?.id) {
          await updateMotion(initial.id, form)
          if (file) await fileMotion(initial.id)
          toast.success(file ? "Motion filed" : "Changes saved")
          router.push(`${basePath}/${initial.id}`)
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
          <h2 className="mb-4 text-lg font-semibold">Motion Details</h2>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Motion Title *</label>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g., Motion to Suppress Evidence Obtained at Traffic Stop"
                className="mt-1"
                required
              />
            </div>
            {!lockedCaseId && (
              <div>
                <label className="text-sm font-medium">Case *</label>
                <Select value={form.caseId} onValueChange={(v) => set("caseId", v ?? "")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a case" />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Motion Type</label>
                <Select value={form.motionType} onValueChange={(v) => set("motionType", v ?? "")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {motionTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Urgency</label>
                <Select value={form.urgency} onValueChange={(v) => set("urgency", v ?? "")}>
                  <SelectTrigger className="mt-1">
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
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Relief & Argument</h2>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Relief Requested</label>
              <Textarea
                value={form.relief}
                onChange={(e) => set("relief", e.target.value)}
                placeholder="State precisely what you are asking the court to order…"
                className="mt-1 min-h-20"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Legal Argument</label>
              <Textarea
                value={form.argument}
                onChange={(e) => set("argument", e.target.value)}
                placeholder="The legal grounds and argument supporting the requested relief…"
                className="mt-1 min-h-32"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Factual Basis</label>
              <Textarea
                value={form.factualBasis}
                onChange={(e) => set("factualBasis", e.target.value)}
                placeholder="The facts the court should rely on…"
                className="mt-1 min-h-24"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Authorities Cited</label>
              <Textarea
                value={form.authoritiesCited}
                onChange={(e) => set("authoritiesCited", e.target.value)}
                placeholder="Statutes, rules, and case law relied upon…"
                className="mt-1 min-h-20"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-1 text-lg font-semibold">Supporting Exhibits</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Attach links to exhibits and supporting documents.
          </p>
          <div className="grid gap-4">
            <EvidenceLinksEditor
              links={(form.evidenceLinks ?? []) as EvidenceLink[]}
              onChange={(links) => set("evidenceLinks", links as EvidenceLink[])}
            />
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Request a hearing</p>
                <p className="text-xs text-muted-foreground">
                  Ask the court to set this motion for oral argument.
                </p>
              </div>
              <Switch
                checked={Boolean(form.hearingRequested)}
                onCheckedChange={(v) => set("hearingRequested", v)}
              />
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending}>
            <Send className="size-4" />
            {pending && action === "file" ? "Filing…" : "File Motion"}
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
            Save a draft to run the AI review and strengthen your motion before filing.
          </p>
        </Card>
      </div>
    </div>
  )
}
