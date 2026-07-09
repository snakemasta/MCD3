"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Gavel, Check, X, HelpCircle, Scale, Play } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
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
  startMotionReview,
  requestMotionInfo,
  ruleOnMotion,
  type MotionRulingType,
} from "@/app/actions/motions"

type DialogKind = "info" | MotionRulingType | null

const RULING_META: Record<
  MotionRulingType,
  { label: string; title: string; className: string }
> = {
  granted: { label: "Grant Motion", title: "Grant Motion", className: "bg-green-600 text-white hover:bg-green-700" },
  granted_in_part: { label: "Grant in Part", title: "Grant Motion in Part", className: "bg-teal-600 text-white hover:bg-teal-700" },
  denied: { label: "Deny Motion", title: "Deny Motion", className: "" },
}

export function MotionDecisionPanel({
  motionId,
  status,
  canRule,
}: {
  motionId: string
  status: string
  canRule: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [ruling, setRuling] = useState("")
  const [summary, setSummary] = useState("")
  const [question, setQuestion] = useState("")

  const isDecided = ["granted", "denied", "granted_in_part", "withdrawn", "closed"].includes(status)

  function run(fn: () => Promise<unknown>, successMsg: string) {
    startTransition(async () => {
      try {
        await fn()
        toast.success(successMsg)
        setDialog(null)
        setRuling("")
        setSummary("")
        setQuestion("")
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
        <h2 className="text-sm font-semibold">Ruling</h2>
      </div>

      {status === "submitted" && (
        <Button
          className="mt-4 w-full"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => startMotionReview(motionId), "Review started")}
        >
          <Play className="size-4" />
          Start Review
        </Button>
      )}

      {isDecided ? (
        <p className="mt-4 text-sm text-muted-foreground">
          This motion has been resolved. No further action is available.
        </p>
      ) : (
        <div className="mt-4 grid gap-2">
          {canRule && (
            <>
              <Button
                className={RULING_META.granted.className}
                disabled={pending}
                onClick={() => setDialog("granted")}
              >
                <Check className="size-4" />
                {RULING_META.granted.label}
              </Button>
              <Button
                className={RULING_META.granted_in_part.className}
                disabled={pending}
                onClick={() => setDialog("granted_in_part")}
              >
                <Scale className="size-4" />
                {RULING_META.granted_in_part.label}
              </Button>
              <Button
                variant="outline"
                className="text-destructive"
                disabled={pending}
                onClick={() => setDialog("denied")}
              >
                <X className="size-4" />
                {RULING_META.denied.label}
              </Button>
            </>
          )}
          <Button variant="outline" disabled={pending} onClick={() => setDialog("info")}>
            <HelpCircle className="size-4" />
            Request More Info
          </Button>
        </div>
      )}

      {/* Request more info */}
      <Dialog open={dialog === "info"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request More Information</DialogTitle>
            <DialogDescription>
              The motion returns to the filing party with your question.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What additional information or briefing do you need?"
            className="min-h-28"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() => run(() => requestMotionInfo(motionId, question), "Information requested")}
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ruling dialogs (grant / grant in part / deny) */}
      <Dialog
        open={dialog === "granted" || dialog === "granted_in_part" || dialog === "denied"}
        onOpenChange={(o) => !o && setDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog ? RULING_META[dialog as MotionRulingType]?.title : "Ruling"}</DialogTitle>
            <DialogDescription>
              Enter your written order. This is recorded on the case timeline and the parties are notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Order / Ruling</label>
              <Textarea
                value={ruling}
                onChange={(e) => setRuling(e.target.value)}
                placeholder="The court's order and reasoning…"
                className="mt-1 min-h-32"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Short summary (optional)</label>
              <Input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="One-line summary of the ruling"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              className={dialog && dialog !== "info" ? RULING_META[dialog].className : ""}
              variant={dialog === "denied" ? "destructive" : "default"}
              disabled={pending}
              onClick={() =>
                run(
                  () => ruleOnMotion(motionId, dialog as MotionRulingType, ruling, summary),
                  "Ruling entered",
                )
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
