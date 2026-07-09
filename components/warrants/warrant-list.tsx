"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, FileWarning } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WarrantStatusBadge } from "@/components/warrants/warrant-status-badge"
import { WARRANT_STATUSES } from "@/lib/constants"
import { warrantTypeLabel } from "@/lib/warrant-utils"

export interface WarrantListItem {
  id: string
  warrantNumber: string
  title: string
  warrantType: string
  suspectName: string | null
  requestingOfficerName: string | null
  agency: string | null
  status: string
  judgeName: string | null
  createdAt: string
  decidedAt: string | null
  linkedProsecutionCaseId: string | null
  linkedDefenseCaseId: string | null
}

interface FilterOptions {
  agencies: string[]
  officers: { id: string; name: string }[]
  judges: { id: string; name: string }[]
}

export function WarrantList({
  warrants,
  filterOptions,
  typeOptions,
  statusLabels = {},
  basePath,
}: {
  warrants: WarrantListItem[]
  filterOptions: FilterOptions
  typeOptions: { value: string; label: string }[]
  statusLabels?: Record<string, string>
  /** Detail link base, e.g. "/judge/warrant". */
  basePath: string
}) {
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("all")
  const [type, setType] = useState("all")
  const [agency, setAgency] = useState("all")
  const [officer, setOfficer] = useState("all")
  const [judge, setJudge] = useState("all")

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return warrants.filter((w) => {
      if (status !== "all" && w.status !== status) return false
      if (type !== "all" && w.warrantType !== type) return false
      if (agency !== "all" && w.agency !== agency) return false
      if (officer !== "all" && w.requestingOfficerName !== officer) return false
      if (judge !== "all" && w.judgeName !== judge) return false
      if (needle) {
        const hay = `${w.title} ${w.warrantNumber} ${w.suspectName ?? ""} ${w.agency ?? ""}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [warrants, q, status, type, agency, officer, judge])

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, number, suspect…"
              className="pl-8"
              aria-label="Search warrants"
            />
          </div>
          <FilterSelect label="Status" value={status} onChange={setStatus} options={WARRANT_STATUSES.map((s) => ({ value: s.value, label: statusLabels[s.value] ?? s.label }))} />
          <FilterSelect label="Type" value={type} onChange={setType} options={typeOptions} />
          <FilterSelect label="Agency" value={agency} onChange={setAgency} options={filterOptions.agencies.map((a) => ({ value: a, label: a }))} />
          <FilterSelect label="Officer" value={officer} onChange={setOfficer} options={filterOptions.officers.map((o) => ({ value: o.name, label: o.name }))} />
          <FilterSelect label="Judge" value={judge} onChange={setJudge} options={filterOptions.judges.map((j) => ({ value: j.name, label: j.name }))} />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <FileWarning className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No warrants match your filters.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((w) => (
            <Card key={w.id} className="p-0 transition-colors hover:bg-muted/50">
              <Link href={`${basePath}/${w.id}`} className="block p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold">{w.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {w.warrantNumber} · {warrantTypeLabel(w.warrantType, typeOptions)}
                    </p>
                  </div>
                  <WarrantStatusBadge status={w.status} labels={statusLabels} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <Field label="Suspect" value={w.suspectName} />
                  <Field label="Officer" value={w.requestingOfficerName} />
                  <Field label="Agency" value={w.agency} />
                  <Field label="Judge" value={w.judgeName} />
                  <Field
                    label="Submitted"
                    value={w.createdAt ? new Date(w.createdAt).toLocaleDateString() : null}
                  />
                  <Field
                    label="Decided"
                    value={w.decidedAt ? new Date(w.decidedAt).toLocaleDateString() : null}
                  />
                  <Field
                    label="Linked cases"
                    value={
                      [w.linkedProsecutionCaseId && "Prosecution", w.linkedDefenseCaseId && "Defense"]
                        .filter(Boolean)
                        .join(" + ") || null
                    }
                  />
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "all")}>
      <SelectTrigger aria-label={`Filter by ${label}`}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="truncate font-medium text-foreground">{value || "—"}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
