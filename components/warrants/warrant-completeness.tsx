import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { computeChecklist, checklistCompletion, type WarrantLike } from "@/lib/warrant-utils"

/**
 * Renders the warrant completeness checklist. Pure server component — derives
 * everything from the warrant record so it stays in sync with stored data.
 */
export function WarrantCompleteness({
  warrant,
  className,
}: {
  warrant: WarrantLike
  className?: string
}) {
  const items = computeChecklist(warrant)
  const pct = checklistCompletion(items, "all")
  const doneCount = items.filter((i) => i.done).length

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Completeness Checklist</h2>
        <span className="text-sm font-medium tabular-nums text-muted-foreground">
          {doneCount}/{items.length}
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2" aria-label="Completeness checklist">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2.5 text-sm">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full",
                item.done ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground",
              )}
            >
              {item.done ? <Check className="size-3" /> : <X className="size-3" />}
            </span>
            <span className={cn(item.done ? "text-foreground" : "text-muted-foreground")}>
              {item.label}
            </span>
            {item.audience === "judge" && (
              <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                Court
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
