import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { MOTION_STATUS_COLORS } from "@/lib/constants"
import { motionStatusLabel } from "@/lib/motion-utils"

export function MotionStatusBadge({
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
        MOTION_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground",
        "border-transparent font-medium",
        className,
      )}
    >
      {motionStatusLabel(status, labels)}
    </Badge>
  )
}
