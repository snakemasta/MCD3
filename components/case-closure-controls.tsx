"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, RotateCcw, XCircle, AlertCircle } from "lucide-react"
import { closeCase, reopenCase, dismissClosureRequest } from "@/app/actions/cases"
import { Button } from "@/components/ui/button"

interface CaseClosureControlsProps {
  caseId: string
  status: string
  canEdit: boolean
  closureRequested: boolean
  closureReason: string | null
  closedAt: Date | string | null
}

function fmt(d: Date | string | null) {
  if (!d) return ""
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function CaseClosureControls({
  caseId,
  status,
  canEdit,
  closureRequested,
  closureReason,
  closedAt,
}: CaseClosureControlsProps) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const isClosed = status === "closed"

  // Nothing actionable for a non-staff viewer on an active, unrequested case.
  if (!isClosed && !closureRequested && !canEdit) return null

  function run(fn: () => Promise<void>, msg: string) {
    start(async () => {
      try {
        await fn()
        toast.success(msg)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  if (isClosed) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-sm font-medium">This case is closed{closedAt ? ` (${fmt(closedAt)})` : ""}.</p>
            <p className="text-xs text-muted-foreground">
              It now lives in the Case Depot. Reopen it to resume active work.
            </p>
          </div>
        </div>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            disabled={pending}
            onClick={() => run(() => reopenCase(caseId), "Case reopened")}
          >
            <RotateCcw data-icon="inline-start" />
            Reopen Case
          </Button>
        )}
      </div>
    )
  }

  if (closureRequested) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-medium">The client has requested to close this case.</p>
            {closureReason ? (
              <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
                {'"'}
                {closureReason}
                {'"'}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No reason was provided.</p>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="gap-1.5"
              disabled={pending}
              onClick={() => run(() => closeCase(caseId), "Case closed")}
            >
              <CheckCircle2 data-icon="inline-start" />
              Confirm &amp; Close
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={pending}
              onClick={() => run(() => dismissClosureRequest(caseId), "Closure request dismissed")}
            >
              <XCircle data-icon="inline-start" />
              Dismiss Request
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Active case, staff can close it directly.
  return (
    <div className="flex justify-end">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        disabled={pending}
        onClick={() => run(() => closeCase(caseId), "Case closed")}
      >
        <XCircle data-icon="inline-start" />
        Close Case
      </Button>
    </div>
  )
}
