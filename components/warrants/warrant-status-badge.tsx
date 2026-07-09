import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { WARRANT_STATUS_COLORS } from "@/lib/constants"
import { warrantStatusLabel } from "@/lib/warrant-utils"

export function WarrantStatusBadge({
  status,
  labels = {},
  className,
}: {
  status: string
  labels?: Record<string, string>
  className?: string
}) {
  return (
    <Badge
      className={cn(
        WARRANT_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground",
        "border-transparent font-medium",
        className,
      )}
    >
      {warrantStatusLabel(status, labels)}
    </Badge>
  )
}
