"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FolderPlus, Check } from "lucide-react"
import { addReportToCaseEvidence } from "@/app/actions/police-reports"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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

interface CaseOption {
  id: string
  title: string
  caseNumber: string
  clientName: string
  status: string
}

interface AddReportToCaseProps {
  reportId: string
  reportTitle: string
  cases: CaseOption[]
  alreadyAddedCaseIds: string[]
}

export function AddReportToCase({
  reportId,
  reportTitle,
  cases,
  alreadyAddedCaseIds,
}: AddReportToCaseProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [caseId, setCaseId] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const addedSet = useMemo(
    () => new Set(alreadyAddedCaseIds),
    [alreadyAddedCaseIds],
  )

  const selectItems = cases.map((c) => ({
    value: c.id,
    label: `${c.caseNumber} — ${c.title}`,
  }))

  async function submit() {
    if (!caseId) {
      toast.error("Select a case.")
      return
    }
    setSaving(true)
    try {
      await addReportToCaseEvidence({ reportId, caseId })
      toast.success("Added to the case evidence locker.")
      setOpen(false)
      setCaseId("")
      router.refresh()
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to add to evidence locker.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <FolderPlus data-icon="inline-start" />
        Add To Case Evidence Locker
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Case Evidence Locker</DialogTitle>
          <DialogDescription>
            Copy &ldquo;{reportTitle}&rdquo; into a case&apos;s evidence locker.
            The narrative and any attached links are carried over.
          </DialogDescription>
        </DialogHeader>

        {cases.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            There are no open cases available to add evidence to.
          </p>
        ) : (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="case-select">Destination case</FieldLabel>
              <Select
                items={selectItems}
                value={caseId}
                onValueChange={(v) => setCaseId(v ?? "")}
              >
                <SelectTrigger id="case-select">
                  <SelectValue placeholder="Select a case" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {cases.map((c) => {
                      const added = addedSet.has(c.id)
                      return (
                        <SelectItem
                          key={c.id}
                          value={c.id}
                          disabled={added}
                        >
                          <span className="flex items-center gap-2">
                            {added && <Check className="size-3.5" />}
                            {c.caseNumber} — {c.title}
                            {added ? " (already added)" : ""}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={submit} disabled={saving || cases.length === 0}>
            {saving ? "Adding..." : "Add To Evidence Locker"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
