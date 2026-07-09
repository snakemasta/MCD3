"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Scale,
} from "lucide-react"
import type { Role } from "@/lib/constants"
import { can } from "@/lib/constants"
import { saveAnalysis, type CaseAnalysisResult } from "@/app/actions/analysis"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface AnalysisTabProps {
  role: Role
  caseId: string
  analysis: { id: string; createdAt: Date; result: CaseAnalysisResult } | null
}

export function AnalysisTab({ role, caseId, analysis }: AnalysisTabProps) {
  const router = useRouter()
  const canUse = can(role, "ai:use")
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<CaseAnalysisResult | null>(
    analysis?.result ?? null,
  )

  async function run() {
    setRunning(true)
    try {
      const res = await fetch("/api/case-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Analysis failed")
      }
      const data = (await res.json()) as CaseAnalysisResult
      setResult(data)
      await saveAnalysis(caseId, data)
      toast.success("Analysis complete.")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed.")
    } finally {
      setRunning(false)
    }
  }

  if (!result) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Sparkles />
          </EmptyMedia>
          <EmptyTitle>No analysis yet</EmptyTitle>
          <EmptyDescription>
            Run an AI defense assessment of probable cause, contradictions,
            strengths, weaknesses, and likely outcomes based on all case data.
          </EmptyDescription>
        </EmptyHeader>
        {canUse && (
          <EmptyContent>
            <Button onClick={run} disabled={running}>
              {running ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles data-icon="inline-start" />
                  Run AI Analysis
                </>
              )}
            </Button>
          </EmptyContent>
        )}
      </Empty>
    )
  }

  const score = result.strengthScore
  const scoreColor =
    score >= 66 ? "text-emerald-400" : score >= 40 ? "text-amber-400" : "text-red-400"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Defense Assessment</h2>
        {canUse && (
          <Button variant="outline" size="sm" onClick={run} disabled={running}>
            {running ? <Spinner data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}
            {running ? "Re-analyzing..." : "Re-run"}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              Defense Strength
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <div className={`text-5xl font-bold tracking-tight ${scoreColor}`}>
              {score}
              <span className="text-xl text-muted-foreground">/100</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={
                  score >= 66
                    ? "h-full rounded-full bg-emerald-500"
                    : score >= 40
                      ? "h-full rounded-full bg-amber-500"
                      : "h-full rounded-full bg-red-500"
                }
                style={{ width: `${score}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.probableCause.established ? (
                <ShieldAlert className="size-4 text-amber-400" />
              ) : (
                <ShieldCheck className="size-4 text-emerald-400" />
              )}
              Probable Cause
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <span
              className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${
                result.probableCause.established
                  ? "bg-amber-500/15 text-amber-300"
                  : "bg-emerald-500/15 text-emerald-300"
              }`}
            >
              {result.probableCause.established
                ? "Appears established"
                : "Challengeable"}
            </span>
            <p className="text-sm text-muted-foreground">
              {result.probableCause.explanation}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="size-4 text-primary" />
            Strategic Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {result.summary}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <ListCard
          title="Strengths"
          icon={<CheckCircle2 className="size-4 text-emerald-400" />}
          items={result.strengths}
          tone="emerald"
        />
        <ListCard
          title="Weaknesses"
          icon={<AlertTriangle className="size-4 text-amber-400" />}
          items={result.weaknesses}
          tone="amber"
        />
        <ListCard
          title="Contradictions"
          icon={<XCircle className="size-4 text-red-400" />}
          items={result.contradictions}
          tone="red"
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Likely Outcomes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {result.likelyOutcomes.map((o, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-sm"
              >
                <span className="min-w-0 text-muted-foreground">{o.outcome}</span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">
                  {o.likelihood}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/25 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            Recommended Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{result.recommendedStrategy}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function ListCard({
  title,
  icon,
  items,
  tone,
}: {
  title: string
  icon: React.ReactNode
  items: string[]
  tone: "emerald" | "amber" | "red"
}) {
  const dot =
    tone === "emerald"
      ? "bg-emerald-400"
      : tone === "amber"
        ? "bg-amber-400"
        : "bg-red-400"
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">None identified.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((it, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dot}`} />
                {it}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
