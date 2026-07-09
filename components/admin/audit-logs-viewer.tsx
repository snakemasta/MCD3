"use client"

import { useState, useTransition } from "react"
import { Search, RotateCw, FileClock } from "lucide-react"
import { listAuditLogs } from "@/app/actions/admin"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type LogRow = Awaited<ReturnType<typeof listAuditLogs>>[number]

const CATEGORIES = [
  { value: "all", label: "All categories" },
  { value: "user", label: "Users" },
  { value: "role", label: "Roles" },
  { value: "permission", label: "Permissions" },
  { value: "case", label: "Cases" },
  { value: "evidence", label: "Evidence" },
  { value: "timeline", label: "Timeline" },
  { value: "ai", label: "AI" },
  { value: "template", label: "Templates" },
  { value: "system", label: "System" },
  { value: "auth", label: "Auth" },
]

const CATEGORY_TONE: Record<string, string> = {
  user: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  role: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  permission: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  case: "bg-primary/10 text-primary",
  evidence: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  timeline: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  ai: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  template: "bg-muted text-muted-foreground",
  system: "bg-muted text-muted-foreground",
  auth: "bg-destructive/10 text-destructive",
}

function formatTime(value: Date | string) {
  const d = new Date(value)
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function AuditLogsViewer({ initial }: { initial: LogRow[] }) {
  const [logs, setLogs] = useState<LogRow[]>(initial)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [isPending, startTransition] = useTransition()

  function refresh(nextSearch = search, nextCategory = category) {
    startTransition(async () => {
      const rows = await listAuditLogs({
        search: nextSearch || undefined,
        category: nextCategory,
      })
      setLogs(rows)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            refresh()
          }}
        >
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor, action, or summary"
            className="pl-9"
          />
        </form>
        <Select
          value={category}
          onValueChange={(v) => {
            const next = (v as string) ?? "all"
            setCategory(next)
            refresh(search, next)
          }}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          onClick={() => refresh()}
          disabled={isPending}
        >
          <RotateCw className={isPending ? "size-4 animate-spin" : "size-4"} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <FileClock className="size-8" />
              <p className="text-sm">No activity recorded yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {logs.map((log) => (
                <li key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <Badge
                    variant="secondary"
                    className={`mt-0.5 shrink-0 capitalize ${CATEGORY_TONE[log.category] ?? ""}`}
                  >
                    {log.category}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground text-pretty">{log.summary}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        {log.actorName ?? "System"}
                      </span>
                      {" · "}
                      <span className="font-mono">{log.action}</span>
                      {" · "}
                      {formatTime(log.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
