"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, Gavel, RefreshCw } from "lucide-react"
import { Card } from "@/components/ui/card"
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
import { toast } from "sonner"
import { scheduleCaseHearing, recordCaseOrder, setCaseStatusAsJudge } from "@/app/actions/judge-cases"

const HEARING_TYPES = [
  "Arraignment",
  "Bail Review",
  "Preliminary Hearing",
  "Motion Hearing",
  "Status Conference",
  "Trial",
  "Sentencing",
]

export function JudgeCaseControls({
  caseId,
  currentStatus,
  statusOptions,
}: {
  caseId: string
  currentStatus: string
  statusOptions: { value: string; label: string }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Hearing form
  const [hearingType, setHearingType] = useState(HEARING_TYPES[0])
  const [hearingDate, setHearingDate] = useState("")
  const [hearingNotes, setHearingNotes] = useState("")

  // Order form
  const [orderTitle, setOrderTitle] = useState("")
  const [orderBody, setOrderBody] = useState("")

  // Status form
  const [status, setStatus] = useState(currentStatus)
  const [statusNote, setStatusNote] = useState("")

  function run(fn: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      try {
        await fn()
        toast.success(success)
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong")
      }
    })
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" />
          <h3 className="font-semibold">Schedule Hearing</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="hearing-type">Hearing type</Label>
            <Select value={hearingType} onValueChange={(v) => setHearingType(v ?? HEARING_TYPES[0])}>
              <SelectTrigger id="hearing-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HEARING_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hearing-date">Date &amp; time</Label>
            <Input
              id="hearing-date"
              type="datetime-local"
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hearing-notes">Notes (optional)</Label>
          <Textarea
            id="hearing-notes"
            value={hearingNotes}
            onChange={(e) => setHearingNotes(e.target.value)}
            placeholder="Location, parties to be present, special instructions..."
            rows={2}
          />
        </div>
        <Button
          disabled={pending || !hearingDate}
          onClick={() =>
            run(
              () =>
                scheduleCaseHearing({
                  caseId,
                  date: hearingDate,
                  hearingType,
                  notes: hearingNotes.trim() || undefined,
                }).then(() => {
                  setHearingDate("")
                  setHearingNotes("")
                }),
              "Hearing scheduled",
            )
          }
        >
          <CalendarClock data-icon="inline-start" />
          Schedule hearing
        </Button>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Gavel className="size-4 text-primary" />
          <h3 className="font-semibold">Enter Order / Finding</h3>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="order-title">Order title</Label>
          <Input
            id="order-title"
            value={orderTitle}
            onChange={(e) => setOrderTitle(e.target.value)}
            placeholder="e.g. Order on Discovery"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="order-body">Findings &amp; order</Label>
          <Textarea
            id="order-body"
            value={orderBody}
            onChange={(e) => setOrderBody(e.target.value)}
            placeholder="The court finds... It is hereby ordered that..."
            rows={4}
          />
        </div>
        <Button
          disabled={pending || !orderTitle.trim() || !orderBody.trim()}
          onClick={() =>
            run(
              () =>
                recordCaseOrder({ caseId, title: orderTitle.trim(), body: orderBody.trim() }).then(
                  () => {
                    setOrderTitle("")
                    setOrderBody("")
                  },
                ),
              "Order entered on the record",
            )
          }
        >
          <Gavel data-icon="inline-start" />
          Enter order
        </Button>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-4 text-primary" />
          <h3 className="font-semibold">Case Status</h3>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="case-status">Set status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v ?? currentStatus)}>
            <SelectTrigger id="case-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status-note">Note (optional)</Label>
          <Textarea
            id="status-note"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            rows={2}
          />
        </div>
        <Button
          variant={status === "closed" ? "destructive" : "default"}
          disabled={pending || status === currentStatus}
          onClick={() =>
            run(
              () =>
                setCaseStatusAsJudge({ caseId, status, note: statusNote.trim() || undefined }).then(
                  () => setStatusNote(""),
                ),
              "Case status updated",
            )
          }
        >
          <RefreshCw data-icon="inline-start" />
          Update status
        </Button>
      </Card>
    </div>
  )
}
