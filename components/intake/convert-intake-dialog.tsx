"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Briefcase, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { convertIntakeToCase } from "@/app/actions/intake"

interface Option {
  value: string
  label: string
}

interface Props {
  intakeId: string
  defaultTitle: string
  defaultCaseType: string
  defaultPriority: string
  caseTypes: Option[]
  priorities: Option[]
  evidenceCount: number
}

export function ConvertIntakeDialog({
  intakeId,
  defaultTitle,
  defaultCaseType,
  defaultPriority,
  caseTypes,
  priorities,
  evidenceCount,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState(defaultTitle)
  const [caseType, setCaseType] = useState(defaultCaseType)
  const [priority, setPriority] = useState(defaultPriority)
  const [importEvidence, setImportEvidence] = useState(true)

  function submit() {
    startTransition(async () => {
      const res = await convertIntakeToCase(intakeId, {
        title,
        caseType,
        priority,
        importEvidence,
      })
      if (res.ok && res.caseId) {
        toast.success("Case created from intake")
        setOpen(false)
        router.push(`/cases/${res.caseId}`)
      } else {
        toast.error(res.error || "Failed to convert intake")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Briefcase className="size-4" data-icon />
            Convert to Case
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert Intake to Case</DialogTitle>
          <DialogDescription>
            Create a new case from this client request. The client will be linked to
            the case and granted portal access based on your default sharing settings.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="case-title">Case Title</Label>
            <Input
              id="case-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descriptive case title"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Case Type</Label>
              <Select value={caseType} onValueChange={(v) => setCaseType(v ?? defaultCaseType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {caseTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v ?? defaultPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {evidenceCount > 0 && (
            <label className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm">
              <Checkbox
                checked={importEvidence}
                onCheckedChange={(c) => setImportEvidence(c === true)}
              />
              <span>
                Import {evidenceCount} client-submitted evidence{" "}
                {evidenceCount === 1 ? "link" : "links"} into the case
              </span>
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending} nativeButton>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !title.trim()} nativeButton>
            {pending && <Loader2 className="size-4 animate-spin" data-icon />}
            Create Case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
