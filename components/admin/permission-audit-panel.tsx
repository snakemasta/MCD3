"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Loader2,
} from "lucide-react"
import { runPermissionAudit } from "@/app/actions/permission-audit"
import type {
  PermissionAuditResult,
  CheckStatus,
} from "@/lib/permission-audit"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const STATUS_META: Record<
  CheckStatus,
  { icon: React.ElementType; className: string; label: string }
> = {
  pass: { icon: CheckCircle2, className: "text-primary", label: "Pass" },
  warn: { icon: AlertTriangle, className: "text-amber-500", label: "Warning" },
  fail: { icon: XCircle, className: "text-destructive", label: "Fail" },
}

export function PermissionAuditPanel() {
  const [result, setResult] = useState<PermissionAuditResult | null>(null)
  const [pending, startTransition] = useTransition()

  function run() {
    startTransition(async () => {
      try {
        const res = await runPermissionAudit()
        setResult(res)
        if (res.summary.fail > 0) {
          toast.error(`${res.summary.fail} check(s) failed`)
        } else if (res.summary.warn > 0) {
          toast.warning(`Passed with ${res.summary.warn} warning(s)`)
        } else {
          toast.success("All permission checks passed")
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Audit failed")
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            Permission Audit
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Check role definitions, admin access, interface access, and
            server-side enforcement.
          </p>
        </div>
        <Button onClick={run} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" data-icon="inline-start" />
              Running...
            </>
          ) : (
            "Run Permission Audit"
          )}
        </Button>
      </CardHeader>

      {result && (
        <CardContent className="flex flex-col gap-5">
          {/* Summary */}
          <div className="flex flex-wrap items-center gap-2">
            <SummaryPill status="pass" count={result.summary.pass} />
            <SummaryPill status="warn" count={result.summary.warn} />
            <SummaryPill status="fail" count={result.summary.fail} />
            <span className="ml-auto text-xs text-muted-foreground">
              Last run {new Date(result.ranAt).toLocaleString()}
            </span>
          </div>

          {result.categories.map((cat) => (
            <div key={cat.id} className="flex flex-col gap-2">
              <div>
                <p className="text-sm font-semibold">{cat.title}</p>
                <p className="text-xs text-muted-foreground">
                  {cat.description}
                </p>
              </div>
              <ul className="flex flex-col gap-2">
                {cat.checks.map((check, i) => {
                  const meta = STATUS_META[check.status]
                  const Icon = meta.icon
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border p-3"
                    >
                      <Icon className={cn("mt-0.5 size-4 shrink-0", meta.className)} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{check.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {check.detail}
                        </p>
                        {check.recommendation && (
                          <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                            Recommendation: {check.recommendation}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}

function SummaryPill({
  status,
  count,
}: {
  status: CheckStatus
  count: number
}) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <Badge variant="outline" className="gap-1.5 px-2.5 py-1 font-normal">
      <Icon className={cn("size-3.5", meta.className)} />
      <span className="tabular-nums">{count}</span> {meta.label}
    </Badge>
  )
}
