"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Send, Undo2, MessageSquarePlus, Reply } from "lucide-react"
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
  fileMotion,
  withdrawMotion,
  respondToMotionInfoRequest,
  respondToMotion,
} from "@/app/actions/motions"

type DialogKind = "info" | "withdraw" | "respond" | null

/**
 * Actions available to the parties (movant + opposing counsel) on a motion
 * detail page, shown based on capabilities and the motion's status.
 */
export function MotionPartyActions({
  motionId,
  status,
  isFiler,
  canRespondOpposing,
  hasInfoRequest,
}: {
  motionId: string
  status: string
  isFiler: boolean
  canRespondOpposing: boolean
  hasInfoRequest: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [text, setText] = useState("")

  const canFile = isFiler && ["draft", "needs_more_info"].includes(status)
  const canWithdraw = isFiler && !["withdrawn", "closed", "denied", "granted"].includes(status)
  const showOpposing =
    canRespondOpposing &&
    !isFiler &&
    ["submitted", "under_review", "needs_more_info"].includes(status)

  if (!canFile && !canWithdraw && !showOpposing && !(isFiler && hasInfoRequest)) {
    return null
  }

  function run(fn: () => Promise<unknown>, msg: string) {
    startTransition(async () => {
      try {
        await fn()
        toast.success(msg)
        setDialog(null)
        setText("")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action failed")
      }
    })
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">Actions</h2>
      <div className="mt-3 grid gap-2">
        {canFile && (
          <Button
            disabled={pending}
            onClick={() => run(() => fileMotion(motionId), "Motion filed")}
          >
            <Send className="size-4" />
            File with the Court
          </Button>
        )}
        {isFiler && hasInfoRequest && status === "needs_more_info" && (
          <Button variant="outline" disabled={pending} onClick={() => setDialog("info")}>
            <MessageSquarePlus className="size-4" />
            Respond to Court&apos;s Request
          </Button>
        )}
        {showOpposing && (
          <Button variant="outline" disabled={pending} onClick={() => setDialog("respond")}>
            <Reply className="size-4" />
            File a Response
          </Button>
        )}
        {canWithdraw && (
          <Button
            variant="ghost"
            className="text-destructive"
            disabled={pending}
            onClick={() => setDialog("withdraw")}
          >
            <Undo2 className="size-4" />
            Withdraw Motion
          </Button>
        )}
      </div>

      <Dialog open={dialog === "info"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to the Court</DialogTitle>
            <DialogDescription>
              Provide the information the court requested. This re-files the motion for review.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Your response to the court's request…"
            className="min-h-28"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() => run(() => respondToMotionInfoRequest(motionId, text), "Response submitted")}
            >
              Submit Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "respond"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File a Response</DialogTitle>
            <DialogDescription>
              Submit your opposition or response to this motion for the court&apos;s consideration.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Your response and supporting argument…"
            className="min-h-32"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() => run(() => respondToMotion(motionId, text), "Response filed")}
            >
              File Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "withdraw"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Motion</DialogTitle>
            <DialogDescription>This removes the motion from the court&apos;s consideration.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reason for withdrawal (optional)…"
            className="min-h-24"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => withdrawMotion(motionId, text), "Motion withdrawn")}
            >
              Confirm Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
