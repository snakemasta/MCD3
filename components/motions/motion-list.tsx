"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, Gavel } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MotionStatusBadge } from "@/components/motions/motion-status-badge"
import { MOTION_STATUSES } from "@/lib/constants"
import { motionTypeLabel, motionSideLabel } from "@/lib/motion-utils"

export interface MotionListItem {
  id: string
  motionNumber: string
  title: string
  motionType: string
  filingSide: string
  filedByName: string | null
  caseId: string
  caseNumber: string | null
  caseTitle: string | null
  status: string
  judgeName: string | null
  urgency: string
  hearingRequested: boolean
  createdAt: string
  decidedAt: string | null
}

interface FilterOptions {
  cases: { id: string; label: string }[]
  filers: { id: string; name: string }[]
}

export function MotionList({
  motions,
  filterOptions,
  typeOptions,
  statusLabels = {},
  basePath,
}: {
  motions: MotionListItem[]
  filterOptions: FilterOptions
  typeOptions: { value: string; label: string }[]
  statusLabels?: Record<string, string>
  /** Detail link base, e.g. "/judge/motion". */
  basePath: string
}) {
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("all")
  const [type, setType] = useState("all")
  const [side, setSide] = useState("all")
  const [filer, setFiler] = useState("all")

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return motions.filter((m) => {
      if (status !== "all" && m.status !== status) return false
      if (type !== "all" && m.motionType !== type) return false
      if (side !== "all" && m.filingSide !== side) return false
      if (filer !== "all" && m.filedByName !== filer) return false
      if (needle) {
        const hay =
          `${m.title} ${m.motionNumber} ${m.caseNumber ?? ""} ${m.caseTitle ?? ""}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [motions, q, status, type, side, filer])

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, number, case…"
              className="pl-8"
              aria-label="Search motions"
            />
          </div>
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={MOTION_STATUSES.map((s) => ({ value: s.value, label: statusLabels[s.value] ?? s.label }))}
          />
          <FilterSelect label="Type" value={type} onChange={setType} options={typeOptions} />
          <FilterSelect
            label="Side"
            value={side}
            onChange={setSide}
            options={[
              { value: "defense", label: "Defense" },
              { value: "prosecution", label: "Prosecution" },
            ]}
          />
          <FilterSelect
            label="Filer"
            value={filer}
            onChange={setFiler}
            options={filterOptions.filers.map((f) => ({ value: f.name, label: f.name }))}
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <Gavel className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No motions match your filters.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <Card key={m.id} className="p-0 transition-colors hover:bg-muted/50">
              <Link href={`${basePath}/${m.id}`} className="block p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">{m.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {m.motionNumber} · {motionTypeLabel(m.motionType, typeOptions)} ·{" "}
                      {motionSideLabel(m.filingSide)}
                    </p>
                  </div>
                  <MotionStatusBadge status={m.status} labels={statusLabels} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <Field label="Case" value={m.caseNumber || m.caseTitle} />
                  <Field label="Filed by" value={m.filedByName} />
                  <Field label="Judge" value={m.judgeName} />
                  <Field
                    label="Hearing"
                    value={m.hearingRequested ? "Requested" : null}
                  />
                  <Field
                    label="Filed"
                    value={m.createdAt ? new Date(m.createdAt).toLocaleDateString() : null}
                  />
                  <Field
                    label="Decided"
                    value={m.decidedAt ? new Date(m.decidedAt).toLocaleDateString() : null}
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
