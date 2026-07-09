"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Sparkles,
  Gavel,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  ListChecks,
  Scale,
  FileSearch,
  MessageCircleQuestion,
  Handshake,
} from "lucide-react"
import {
  saveProsecutionAnalysis,
  type ProsecutionAnalysisResult,
} from "@/app/actions/prosecution-analysis"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface ProsecutionAiPanelProps {
  caseId: string
  canUse: boolean
  analysis: { id: string; createdAt: Date | string; result: ProsecutionAnalysisResult } | null
}

export function ProsecutionAiPanel({ caseId, canUse, analysis }: ProsecutionAiPanelProps) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ProsecutionAnalysisResult | null>(
    analysis?.result ?? null,
  )

  async function run() {
    setRunning(true)
    try {
      const res = await fetch("/api/prosecution-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Analysis failed")
      }
      const data = (await res.json()) as ProsecutionAnalysisResult
      setResult(data)
      await saveProsecutionAnalysis(caseId, data)
      toast.success("Prosecution analysis complete.")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed.")
    } finally {
      setRunning(false)
    }
  }

  if (!result) {
    return (
      <Empty className="rounded-xl border border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Gavel />
          </EmptyMedia>
          <EmptyTitle>Prosecution AI</EmptyTitle>
          <EmptyDescription>
            Assess case strength for prosecution: charge elements, missing evidence, probable
            cause issues, discovery risks, likely defense arguments, charging and plea options,
            and dismissal risks.
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
                  Run Prosecution AI
                </>
              )}
            </Button>
          </EmptyContent>
        )}
      </Empty>
    )
  }

  const score = result.caseStrengthScore
  const scoreColor =
    score >= 66 ? "text-emerald-400" : score >= 40 ? "text-amber-400" : "text-red-400"
  const scoreBar =
    score >= 66 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Gavel className="size-5 text-primary" />
          Prosecution AI
        </h2>
        {canUse && (
          <Button variant="outline" size="sm" onClick={run} disabled={running}>
            {running ? <Spinner data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}
            {running ? "Re-analyzing..." : "Re-run"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary" />
            Case Strength (Prosecution)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <div className={`text-5xl font-bold tracking-tight ${scoreColor}`}>
            {score}
            <span className="text-xl text-muted-foreground">/100</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${scoreBar}`} style={{ width: `${score}%` }} />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{result.summary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {result.probableCause.sufficient ? (
              <ShieldCheck className="size-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="size-4 text-amber-400" />
            )}
            Probable Cause
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Badge
            variant="secondary"
            className={
              result.probableCause.sufficient
                ? "w-fit bg-emerald-500/15 text-emerald-300"
                : "w-fit bg-amber-500/15 text-amber-300"
            }
          >
            {result.probableCause.sufficient ? "Sufficient" : "At risk"}
          </Badge>
          <p className="text-sm text-muted-foreground">{result.probableCause.explanation}</p>
        </CardContent>
      </Card>

      {result.chargeElements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="size-4 text-primary" />
              Charge Elements
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {result.chargeElements.map((c, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{c.charge}</p>
                  <Badge variant="outline" className="capitalize">
                    {c.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.analysis}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <ListCard title="Missing Evidence" icon={<FileSearch className="size-4 text-amber-400" />} items={result.missingEvidence} dot="bg-amber-400" />
        <ListCard title="Discovery Risks" icon={<AlertTriangle className="size-4 text-amber-400" />} items={result.discoveryRisks} dot="bg-amber-400" />
        <ListCard title="Likely Defense Arguments" icon={<ShieldAlert className="size-4 text-blue-400" />} items={result.likelyDefenseArguments} dot="bg-blue-400" />
        <ListCard title="Dismissal Risks" icon={<AlertTriangle className="size-4 text-red-400" />} items={result.dismissalRisks} dot="bg-red-400" />
        <ListCard title="Stronger Charges" icon={<TrendingUp className="size-4 text-emerald-400" />} items={result.strongerCharges} dot="bg-emerald-400" />
        <ListCard title="Lesser Included Charges" icon={<Scale className="size-4 text-muted-foreground" />} items={result.lesserIncludedCharges} dot="bg-muted-foreground" />
        <ListCard title="Evidence Requests" icon={<FileSearch className="size-4 text-primary" />} items={result.evidenceRequests} dot="bg-primary" />
        <ListCard title="Witness Questions" icon={<MessageCircleQuestion className="size-4 text-primary" />} items={result.witnessQuestions} dot="bg-primary" />
        <ListCard title="Plea Options" icon={<Handshake className="size-4 text-primary" />} items={result.pleaOptions} dot="bg-primary" />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Warrant Strength</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{result.warrantStrength || "Not assessed."}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Police Report Strength</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{result.policeReportStrength || "Not assessed."}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/25 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="size-4 text-primary" />
            Recommended Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result.recommendedNextSteps.length === 0 ? (
            <p className="text-sm text-muted-foreground">None provided.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {result.recommendedNextSteps.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="font-medium text-primary">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ListCard({
  title,
  icon,
  items,
  dot,
}: {
  title: string
  icon: React.ReactNode
  items: string[]
  dot: string
}) {
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
