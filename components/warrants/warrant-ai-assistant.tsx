"use client"

import { useState } from "react"
import { Sparkles, AlertTriangle, ListChecks, Wrench, HelpCircle, FileText, Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { VERDICT_META } from "@/lib/warrant-utils"

export type WarrantAudience = "law_enforcement" | "judge" | "state_attorney" | "defense"

interface AiResult {
  summary: string
  completenessScore: number
  probableCauseScore: number
  evidenceScore: number
  timelineScore: number
  rejectionRiskScore: number
  supportingFacts: string[]
  missingComponents: string[]
  recommendedFixes: string[]
  suggestedQuestions: string[]
  considerations: string[]
  probableCauseRewrite: string
  verdict: "pass" | "needs_work" | "high_risk"
  strength: number
}

const AUDIENCE_LABEL: Record<WarrantAudience, string> = {
  law_enforcement: "Officer review",
  judge: "Judicial review",
  state_attorney: "Prosecution review",
  defense: "Defense review",
}

function ScoreBar({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  // For risk (invert), high values are bad.
  const good = invert ? value <= 40 : value >= 75
  const mid = invert ? value <= 70 : value >= 50
  const color = good ? "bg-green-500" : mid ? "bg-yellow-500" : "bg-red-500"
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof ListChecks
  title: string
  items: string[]
}) {
  if (!items?.length) return null
  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
      </h4>
      <ul className="mt-1.5 space-y-1 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function WarrantAiAssistant({
  warrantId,
  audience,
  initialResult,
  className,
}: {
  warrantId: string
  audience: WarrantAudience
  initialResult?: AiResult | null
  className?: string
}) {
  const [result, setResult] = useState<AiResult | null>(initialResult ?? null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const res = await fetch("/api/warrant-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warrantId, audience }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "AI analysis failed")
      }
      setResult(await res.json())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI analysis failed")
    } finally {
      setLoading(false)
    }
  }

  const verdict = result ? VERDICT_META[result.verdict] : null

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </span>
          <div className="leading-tight">
            <h2 className="text-sm font-semibold">Warrant AI Assistant</h2>
            <p className="text-xs text-muted-foreground">{AUDIENCE_LABEL[audience]}</p>
          </div>
        </div>
        {verdict && <Badge className={cn(verdict.className, "border-transparent")}>{verdict.label}</Badge>}
      </div>

      {!result && (
        <p className="mt-3 text-sm text-muted-foreground">
          Run an AI review to score completeness, probable cause, evidence, and rejection risk, and get
          concrete recommendations.
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-4">
          <p className="text-sm">{result.summary}</p>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <ScoreBar label="Completeness" value={result.completenessScore} />
            <ScoreBar label="Probable cause" value={result.probableCauseScore} />
            <ScoreBar label="Evidence support" value={result.evidenceScore} />
            <ScoreBar label="Timeline" value={result.timelineScore} />
            <ScoreBar label="Rejection risk" value={result.rejectionRiskScore} invert />
            <ScoreBar label="Overall strength" value={result.strength} />
          </div>

          <Section icon={ListChecks} title="Supporting facts" items={result.supportingFacts} />
          <Section icon={AlertTriangle} title="Missing components" items={result.missingComponents} />
          <Section icon={Wrench} title="Recommended fixes" items={result.recommendedFixes} />
          <Section icon={HelpCircle} title="Suggested questions" items={result.suggestedQuestions} />
          <Section icon={FileText} title="Considerations" items={result.considerations} />

          {result.probableCauseRewrite && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <FileText className="size-3.5" />
                Suggested probable cause rewrite
              </h4>
              <div className="mt-1.5 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                {result.probableCauseRewrite}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-1.5"
                onClick={() => {
                  navigator.clipboard.writeText(result.probableCauseRewrite)
                  toast.success("Copied to clipboard")
                }}
              >
                <Copy className="size-3.5" />
                Copy rewrite
              </Button>
            </div>
          )}
        </div>
      )}

      <Button onClick={run} disabled={loading} size="sm" className="mt-4 w-full">
        <Sparkles className="size-4" />
        {loading ? "Analyzing…" : result ? "Re-run AI review" : "Run AI review"}
      </Button>
    </div>
  )
}
