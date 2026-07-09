"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Gavel, Check, X, HelpCircle, Ban, Undo2, Save, Play } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  startWarrantReview,
  saveJudgeNotes,
  requestMoreInfo,
  approveWarrant,
  denyWarrant,
  setWarrantStatus,
} from "@/app/actions/warrants"

type DialogKind = "info" | "approve" | "deny" | null

export function JudgeDecisionPanel({
  warrantId,
  status,
  initialNotes,
  canApprove,
}: {
  warrantId: string
  status: string
  initialNotes: string | null
  canApprove: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [notes, setNotes] = useState(initialNotes ?? "")
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [text, setText] = useState("")
  const [extra, setExtra] = useState("")

  const isDecided = ["approved", "denied", "closed"].includes(status)

  function run(fn: () => Promise<unknown>, successMsg: string) {
    startTransition(async () => {
      try {
        await fn()
        toast.success(successMsg)
        setDialog(null)
        setText("")
        setExtra("")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action failed")
      }
    })
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Gavel className="size-4" />
        </span>
        <h2 className="text-sm font-semibold">Judicial Decision</h2>
      </div>

      {status === "submitted" && (
        <Button
          className="mt-4 w-full"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => startWarrantReview(warrantId), "Review started")}
        >
          <Play className="size-4" />
          Start Review
        </Button>
      )}

      <div className="mt-4">
        <label className="text-sm font-medium">Judge Notes</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Record your review notes and findings…"
          className="mt-1 min-h-28"
          disabled={isDecided}
        />
        {!isDecided && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            disabled={pending}
            onClick={() => run(() => saveJudgeNotes(warrantId, notes), "Notes saved")}
          >
            <Save className="size-4" />
            Save notes
          </Button>
        )}
      </div>

      {!isDecided && (
        <div className="mt-4 grid gap-2">
          {canApprove && (
            <Button
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={pending}
              onClick={() => setDialog("approve")}
            >
              <Check className="size-4" />
              Approve Warrant
            </Button>
          )}
          <Button variant="outline" disabled={pending} onClick={() => setDialog("info")}>
            <HelpCircle className="size-4" />
            Request More Info
          </Button>
          {canApprove && (
            <Button
              variant="outline"
              className="text-destructive"
              disabled={pending}
              onClick={() => setDialog("deny")}
            >
              <X className="size-4" />
              Deny Warrant
            </Button>
          )}
          {canApprove && (
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() => setWarrantStatus(warrantId, "not_active", notes), "Marked not active")
                }
              >
                <Ban className="size-4" />
                Not Active
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() => setWarrantStatus(warrantId, "warrant_returned", notes), "Marked returned")
                }
              >
                <Undo2 className="size-4" />
                Returned
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Request more info */}
      <Dialog open={dialog === "info"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request More Information</DialogTitle>
            <DialogDescription>
              The warrant returns to the requesting officer with your question.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What additional information or clarification do you need?"
            className="min-h-28"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() => run(() => requestMoreInfo(warrantId, text, notes), "Information requested")}
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve */}
      <Dialog open={dialog === "approve"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Warrant</DialogTitle>
            <DialogDescription>
              Approving issues the warrant and may create a prosecution case automatically.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="Optional approval notes…"
            className="min-h-24"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={pending}
              onClick={() => run(() => approveWarrant(warrantId, extra || notes), "Warrant approved")}
            >
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny */}
      <Dialog open={dialog === "deny"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Warrant</DialogTitle>
            <DialogDescription>Provide a reason for the denial.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reason for denial…"
            className="min-h-28"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => denyWarrant(warrantId, text, notes), "Warrant denied")}
            >
              Confirm Denial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
