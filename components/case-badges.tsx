import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  CASE_STATUSES,
  CASE_PRIORITIES,
  EVIDENCE_STATUSES,
  PLAN_STATUSES,
  ROLES,
  labelOf,
} from "@/lib/constants"

export function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: "bg-blue-500/15 text-blue-300 border-blue-500/25",
    attorney: "bg-sky-500/15 text-sky-300 border-sky-500/25",
    public_defender: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
    paralegal: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    investigator: "bg-amber-500/15 text-amber-300 border-amber-500/25",
    viewer: "bg-muted text-muted-foreground border-border",
  }
  return (
    <Badge variant="outline" className={cn("font-medium", styles[role])}>
      {labelOf(ROLES, role)}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    intake: "bg-sky-500/15 text-sky-300 border-sky-500/25",
    investigation: "bg-amber-500/15 text-amber-300 border-amber-500/25",
    pre_trial: "bg-violet-500/15 text-violet-300 border-violet-500/25",
    trial: "bg-blue-500/15 text-blue-300 border-blue-500/25",
    appeal: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/25",
    closed: "bg-muted text-muted-foreground border-border",
  }
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status])}>
      {labelOf(CASE_STATUSES, status)}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    low: "bg-muted text-muted-foreground border-border",
    normal: "bg-sky-500/15 text-sky-300 border-sky-500/25",
    high: "bg-orange-500/15 text-orange-300 border-orange-500/25",
    urgent: "bg-red-500/15 text-red-300 border-red-500/25",
  }
  return (
    <Badge variant="outline" className={cn("font-medium", styles[priority])}>
      {labelOf(CASE_PRIORITIES, priority)}
    </Badge>
  )
}

export function EvidenceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending_review: "bg-muted text-muted-foreground border-border",
    reviewed: "bg-sky-500/15 text-sky-300 border-sky-500/25",
    key_evidence: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    disputed: "bg-red-500/15 text-red-300 border-red-500/25",
  }
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status])}>
      {labelOf(EVIDENCE_STATUSES, status)}
    </Badge>
  )
}

export function PlanStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    todo: "bg-muted text-muted-foreground border-border",
    in_progress: "bg-amber-500/15 text-amber-300 border-amber-500/25",
    done: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  }
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status])}>
      {labelOf(PLAN_STATUSES, status)}
    </Badge>
  )
}
