"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ClipboardCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { closeOutWarrant, type CloseoutInput } from "@/app/actions/warrants"
import { EvidenceLinksEditor } from "@/components/warrants/evidence-links-editor"
import type { EvidenceLink } from "@/lib/warrant-utils"

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <Label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm font-normal">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </Label>
  )
}

export function CloseoutDialog({ warrantId }: { warrantId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const [form, setForm] = useState<CloseoutInput>({
    served: true,
    servedAt: "",
    arrestLocation: "",
    arrestingOfficer: "",
    agency: "",
    defendantArrested: false,
    evidenceRecovered: false,
    evidenceRecoveredSummary: "",
    evidenceLinks: [],
    defendantContested: false,
    defendantStatement: false,
    forceUsed: false,
    additionalCharges: false,
    additionalChargeDetails: "",
    serviceIssues: "",
    closingNotes: "",
    recommendedNextStep: "",
  })

  function set<K extends keyof CloseoutInput>(key: K, value: CloseoutInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function submit() {
    startTransition(async () => {
      try {
        const { defenseCaseId } = await closeOutWarrant(warrantId, form)
        toast.success(
          defenseCaseId
            ? "Warrant closed out — defense case created for contested charges"
            : "Warrant closed out",
        )
        setOpen(false)
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to close out warrant")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <ClipboardCheck className="size-4" />
        Close Out Warrant
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Close Out Warrant</DialogTitle>
          <DialogDescription>
            Record how the warrant was served and resolved. If the defendant contests charges, a defense
            case is created automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle label="Was the warrant served?" checked={form.served} onChange={(v) => set("served", v)} />
            <div>
              <Label className="text-sm font-medium">Date / time served</Label>
              <Input
                type="datetime-local"
                value={form.servedAt ?? ""}
                onChange={(e) => set("servedAt", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-sm font-medium">Location of arrest / search</Label>
              <Input
                value={form.arrestLocation}
                onChange={(e) => set("arrestLocation", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Arresting officer</Label>
              <Input
                value={form.arrestingOfficer}
                onChange={(e) => set("arrestingOfficer", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Agency</Label>
            <Input value={form.agency} onChange={(e) => set("agency", e.target.value)} className="mt-1" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle label="Was the defendant arrested?" checked={form.defendantArrested} onChange={(v) => set("defendantArrested", v)} />
            <Toggle label="Was evidence recovered?" checked={form.evidenceRecovered} onChange={(v) => set("evidenceRecovered", v)} />
            <Toggle label="Did the defendant contest charges?" checked={form.defendantContested} onChange={(v) => set("defendantContested", v)} />
            <Toggle label="Did the defendant make a statement?" checked={form.defendantStatement} onChange={(v) => set("defendantStatement", v)} />
            <Toggle label="Was force used?" checked={form.forceUsed} onChange={(v) => set("forceUsed", v)} />
            <Toggle label="Additional charges?" checked={form.additionalCharges} onChange={(v) => set("additionalCharges", v)} />
          </div>

          {form.evidenceRecovered && (
            <div>
              <Label className="text-sm font-medium">Evidence recovered summary</Label>
              <Textarea
                value={form.evidenceRecoveredSummary}
                onChange={(e) => set("evidenceRecoveredSummary", e.target.value)}
                className="mt-1 min-h-20"
              />
              <div className="mt-3">
                <Label className="text-sm font-medium">Evidence links</Label>
                <div className="mt-1">
                  <EvidenceLinksEditor
                    links={form.evidenceLinks ?? []}
                    onChange={(links: EvidenceLink[]) => set("evidenceLinks", links)}
                  />
                </div>
              </div>
            </div>
          )}

          {form.additionalCharges && (
            <div>
              <Label className="text-sm font-medium">Additional charge details</Label>
              <Textarea
                value={form.additionalChargeDetails}
                onChange={(e) => set("additionalChargeDetails", e.target.value)}
                className="mt-1 min-h-20"
              />
            </div>
          )}

          <div>
            <Label className="text-sm font-medium">Service issues</Label>
            <Textarea
              value={form.serviceIssues}
              onChange={(e) => set("serviceIssues", e.target.value)}
              placeholder="Any problems encountered during service…"
              className="mt-1 min-h-20"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Closing notes</Label>
            <Textarea
              value={form.closingNotes}
              onChange={(e) => set("closingNotes", e.target.value)}
              className="mt-1 min-h-20"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Recommended next step</Label>
            <Input
              value={form.recommendedNextStep}
              onChange={(e) => set("recommendedNextStep", e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save Closeout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
