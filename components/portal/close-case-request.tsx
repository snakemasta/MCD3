"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, XCircle } from "lucide-react"
import { requestCaseClosure } from "@/app/actions/portal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface CloseCaseRequestProps {
  caseId: string
  status: string
  closureRequested: boolean
}

export function CloseCaseRequest({ caseId, status, closureRequested }: CloseCaseRequestProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [pending, start] = useTransition()

  // Nothing to show once the case is closed.
  if (status === "closed") return null

  if (closureRequested) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          {"You've requested to close this case. Your legal team will review and confirm."}
        </p>
      </div>
    )
  }

  function submit() {
    start(async () => {
      const res = await requestCaseClosure({ caseId, reason: reason.trim() || undefined })
      if (!res.ok) {
        toast.error(res.error ?? "Could not submit your request")
        return
      }
      toast.success("Closure request sent to your legal team")
      setOpen(false)
      setReason("")
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5 self-start" onClick={() => setOpen(true)}>
        <XCircle data-icon="inline-start" />
        Request to Close Case
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="close-reason">Reason for closing (optional)</Label>
        <Textarea
          id="close-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Let your legal team know why you'd like to close this case."
        />
      </div>
      <p className="text-xs text-muted-foreground text-pretty">
        This sends a request to your legal team. They will review it before the case is officially
        closed.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? "Sending..." : "Send Request"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
