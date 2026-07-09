"use client"

import { useState } from "react"
import { Sparkles, AlertTriangle, ListChecks, Wrench, BookOpen, Swords, FileText, Library } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { MOTION_VERDICT_META } from "@/lib/motion-utils"

export type MotionAudience = "filer" | "judge" | "opposing"

interface CitedSource {
  id: string
  title: string
  kind: "memory_bank" | "legal_authority"
  codeSection: string | null
}

interface AiResult {
  summary: string
  meritScore: number
  authoritySupportScore: number
  clarityScore: number
  grantLikelihoodScore: number
  supportingPoints: string[]
  weaknesses: string[]
  recommendedFixes: string[]
  suggestedAuthorities: string[]
  opposingArguments: string[]
  considerations: string[]
  citedSources?: CitedSource[]
  verdict: "strong" | "needs_work" | "weak"
  merit: number
}

const AUDIENCE_LABEL: Record<MotionAudience, string> = {
  filer: "Movant review",
  judge: "Judicial review",
  opposing: "Opposition review",
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "bg-green-500" : value >= 45 ? "bg-yellow-500" : "bg-red-500"
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

export function MotionAiAssistant({
  motionId,
  audience,
  initialResult,
  className,
}: {
  motionId: string
  audience: MotionAudience
  initialResult?: AiResult | null
  className?: string
}) {
  const [result, setResult] = useState<AiResult | null>(initialResult ?? null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const res = await fetch("/api/motion-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motionId, audience }),
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

  const verdict = result ? MOTION_VERDICT_META[result.verdict] : null

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </span>
          <div className="leading-tight">
            <h2 className="text-sm font-semibold">Motion AI Assistant</h2>
            <p className="text-xs text-muted-foreground">{AUDIENCE_LABEL[audience]}</p>
          </div>
        </div>
        {verdict && <Badge className={cn(verdict.className, "border-transparent")}>{verdict.label}</Badge>}
      </div>

      {!result && (
        <p className="mt-3 text-sm text-muted-foreground">
          Run an AI review to score merit, authority support, clarity, and grant likelihood, with
          recommendations grounded in the Memory Bank and Penal Code / SOP Bank.
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-4">
          <p className="text-sm">{result.summary}</p>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <ScoreBar label="Legal merit" value={result.meritScore} />
            <ScoreBar label="Authority support" value={result.authoritySupportScore} />
            <ScoreBar label="Clarity" value={result.clarityScore} />
            <ScoreBar label="Grant likelihood" value={result.grantLikelihoodScore} />
            <ScoreBar label="Overall merit" value={result.merit} />
          </div>

          <Section icon={ListChecks} title="Supporting points" items={result.supportingPoints} />
          <Section icon={AlertTriangle} title="Weaknesses" items={result.weaknesses} />
          <Section icon={Wrench} title="Recommended fixes" items={result.recommendedFixes} />
          <Section icon={BookOpen} title="Suggested authorities" items={result.suggestedAuthorities} />
          <Section icon={Swords} title="Anticipated opposition" items={result.opposingArguments} />
          <Section icon={FileText} title="Considerations" items={result.considerations} />

          {result.citedSources && result.citedSources.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Library className="size-3.5" />
                Sources cited
              </h4>
              <ul className="mt-1.5 space-y-1 text-sm">
                {result.citedSources.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {s.kind === "memory_bank" ? "Memory" : "Law"}
                    </Badge>
                    <span>
                      {s.title}
                      {s.codeSection ? ` (${s.codeSection})` : ""}
                    </span>
                  </li>
                ))}
              </ul>
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
