"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { setIntakeStatus, assignIntakeReviewer, saveIntakeAiReview } from "@/app/actions/intake"
import type { IntakeAiReview } from "@/lib/intake"

interface StatusOption {
  value: string
  label: string
}

interface ReviewerOption {
  id: string
  name: string
  role: string
}

interface Props {
  intakeId: string
  status: string
  reviewerId: string | null
  statusOptions: StatusOption[]
  reviewers: ReviewerOption[]
  aiReview: IntakeAiReview | null
  canConvert: boolean
  canUseAi: boolean
  isLinked: boolean
}

const REC_META: Record<
  string,
  { label: string; icon: typeof CheckCircle2; cls: string }
> = {
  accept: { label: "Recommend Accept", icon: CheckCircle2, cls: "text-emerald-600" },
  decline: { label: "Recommend Decline", icon: AlertTriangle, cls: "text-destructive" },
  needs_info: { label: "Needs More Info", icon: HelpCircle, cls: "text-amber-600" },
}

export function IntakeReviewPanel({
  intakeId,
  status,
  reviewerId,
  statusOptions,
  reviewers,
  aiReview,
  canConvert,
  canUseAi,
  isLinked,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [review, setReview] = useState<IntakeAiReview | null>(aiReview)
  const [analyzing, setAnalyzing] = useState(false)

  function changeStatus(value: string | null) {
    if (!value) return
    startTransition(async () => {
      try {
        await setIntakeStatus(intakeId, value)
        toast.success("Status updated")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update status")
      }
    })
  }

  function changeReviewer(value: string | null) {
    startTransition(async () => {
      try {
        await assignIntakeReviewer(intakeId, value === "unassigned" ? null : value)
        toast.success("Reviewer updated")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to assign reviewer")
      }
    })
  }

  async function runAiReview() {
    setAnalyzing(true)
    try {
      const res = await fetch("/api/intake-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intakeId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "AI review failed")
      }
      const data = (await res.json()) as IntakeAiReview
      setReview(data)
      await saveIntakeAiReview(intakeId, data)
      toast.success("AI review complete")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI review failed")
    } finally {
      setAnalyzing(false)
    }
  }

  const rec = review ? REC_META[review.recommendation] : null
  const RecIcon = rec?.icon

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={changeStatus} disabled={pending || isLinked}>
              <SelectTrigger>
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

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Assigned Reviewer</label>
            <Select
              value={reviewerId ?? "unassigned"}
              onValueChange={changeReviewer}
              disabled={pending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {reviewers.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {canUseAi && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">AI Intake Review</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={runAiReview}
              disabled={analyzing}
              nativeButton
            >
              {analyzing ? (
                <Loader2 className="size-4 animate-spin" data-icon />
              ) : (
                <Sparkles className="size-4" data-icon />
              )}
              {review ? "Re-run" : "Analyze"}
            </Button>
          </CardHeader>
          <CardContent>
            {!review ? (
              <p className="text-sm text-muted-foreground text-pretty">
                Run an AI assessment of this request to gauge merit, identify legal
                issues, and surface missing information before you decide.
              </p>
            ) : (
              <div className="flex flex-col gap-3 text-sm">
                {rec && RecIcon && (
                  <div className={`flex items-center gap-2 font-medium ${rec.cls}`}>
                    <RecIcon className="size-4" />
                    {rec.label}
                    <Badge variant="secondary" className="ml-auto tabular-nums">
                      Merit {review.meritScore}/100
                    </Badge>
                  </div>
                )}
                <p className="text-pretty leading-relaxed">{review.summary}</p>

                <ReviewList title="Legal Issues" items={review.legalIssues} />
                <ReviewList title="Missing Information" items={review.missingInfo} />
                <ReviewList title="Red Flags" items={review.redFlags} />
                <ReviewList title="Suggested Next Steps" items={review.suggestedNextSteps} />

                <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-xs text-muted-foreground">
                  <span>
                    Suggested type: <span className="font-medium text-foreground">{review.caseType}</span>
                  </span>
                  <span>
                    Suggested priority:{" "}
                    <span className="font-medium text-foreground">{review.suggestedPriority}</span>
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isLinked && (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          This request has been converted to a case. Status is locked.
        </p>
      )}
    </div>
  )
}

function ReviewList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="list-disc pl-5 leading-relaxed">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  )
}
