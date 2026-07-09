"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, ShieldAlert, Briefcase } from "lucide-react"
import type { CaseRow } from "@/app/actions/cases"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge, PriorityBadge } from "@/components/case-badges"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { CASE_STATUSES, CASE_PRIORITIES, labelOf, itemsOf, CASE_TYPES } from "@/lib/constants"

export function CasesTable({ cases }: { cases: CaseRow[] }) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [priority, setPriority] = useState("all")

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return cases.filter((c) => {
      if (status !== "all" && c.status !== status) return false
      if (priority !== "all" && c.priority !== priority) return false
      if (
        q &&
        !c.title.toLowerCase().includes(q) &&
        !c.clientName.toLowerCase().includes(q) &&
        !c.caseNumber.toLowerCase().includes(q) &&
        !(c.charges ?? "").toLowerCase().includes(q)
      )
        return false
      return true
    })
  }, [cases, search, status, priority])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search cases, clients, charges..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
        <div className="flex items-center gap-2">
          <Select
            items={{ all: "All Statuses", ...itemsOf(CASE_STATUSES) }}
            value={status}
            onValueChange={(v) => setStatus(v ?? "all")}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All Statuses</SelectItem>
                {CASE_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            items={{ all: "All Priorities", ...itemsOf(CASE_PRIORITIES) }}
            value={priority}
            onValueChange={(v) => setPriority(v ?? "all")}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All Priorities</SelectItem>
                {CASE_PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Briefcase />
            </EmptyMedia>
            <EmptyTitle>No cases found</EmptyTitle>
            <EmptyDescription>
              Try adjusting your search or filters.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Attorney</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => {
                    window.location.href = `/cases/${c.id}`
                  }}
                >
                  <TableCell>
                    <Link
                      href={`/cases/${c.id}`}
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {c.conflictFlag && (
                            <ShieldAlert className="size-3.5 shrink-0 text-red-400" />
                          )}
                          <span className="truncate font-medium">{c.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {c.caseNumber} · {c.clientName}
                        </span>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {labelOf(CASE_TYPES, c.caseType)}
                  </TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">
                    {c.attorneyName ?? (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={c.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
