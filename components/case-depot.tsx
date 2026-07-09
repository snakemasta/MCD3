"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, Archive, ChevronDown, FolderArchive } from "lucide-react"
import type { CaseRow } from "@/app/actions/cases"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Badge } from "@/components/ui/badge"
import { PriorityBadge } from "@/components/case-badges"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export interface CaseDepotGroup {
  type: string
  label: string
  cases: CaseRow[]
}

function formatDate(d: Date | string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function CaseDepot({ groups, total }: { groups: CaseDepotGroup[]; total: number }) {
  const [search, setSearch] = useState("")

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map((g) => ({
        ...g,
        cases: g.cases.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.clientName.toLowerCase().includes(q) ||
            c.caseNumber.toLowerCase().includes(q) ||
            (c.charges ?? "").toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.cases.length > 0)
  }, [groups, search])

  if (total === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Archive />
          </EmptyMedia>
          <EmptyTitle>The depot is empty</EmptyTitle>
          <EmptyDescription>
            Closed cases will be archived here, organized by type.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <InputGroup className="sm:max-w-xs">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search closed cases..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </InputGroup>

      {filteredGroups.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>No matches</EmptyTitle>
            <EmptyDescription>Try a different search term.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredGroups.map((g) => (
            <details
              key={g.type}
              open
              className="group overflow-hidden rounded-lg border border-border"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-muted/40 px-4 py-3 transition-colors hover:bg-muted/60 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2 font-medium">
                  <FolderArchive className="size-4 text-muted-foreground" />
                  {g.label}
                  <Badge variant="secondary" className="ml-1 tabular-nums">
                    {g.cases.length}
                  </Badge>
                </span>
                <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <ul className="divide-y divide-border border-t border-border">
                {g.cases.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/cases/${c.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.caseNumber} · {c.clientName}
                          {c.attorneyName ? ` · ${c.attorneyName}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <PriorityBadge priority={c.priority} />
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          Closed {formatDate(c.updatedAt)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
