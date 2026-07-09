import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<string, string> = {
  new: "bg-secondary text-secondary-foreground",
  under_review: "bg-primary/10 text-primary",
  needs_info: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  converted_to_case: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  declined: "bg-destructive/10 text-destructive",
}

const URGENCY_STYLES: Record<string, string> = {
  low: "bg-secondary text-secondary-foreground",
  normal: "bg-secondary text-secondary-foreground",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  urgent: "bg-destructive/10 text-destructive",
}

export function IntakeStatusBadge({
  status,
  label,
  className,
}: {
  status: string
  label: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {label}
    </span>
  )
}

export function UrgencyBadge({
  urgency,
  label,
  className,
}: {
  urgency: string
  label: string
  className?: string
}) {
  if (urgency === "low" || urgency === "normal") return null
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        URGENCY_STYLES[urgency] ?? "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {label}
    </span>
  )
}
