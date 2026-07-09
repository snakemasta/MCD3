"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BookOpen, Brain, FileText, Plus, Search, Sparkles, X } from "lucide-react"

export interface LawListItem {
  id: string
  title: string
  category: string
  jurisdiction: string
  entryKind: string
  status: string
  aiEnabled: boolean
  codeSection: string | null
  summary: string | null
  tags: string[] | null
  hasDocument: boolean
}

type KindFilter = "all" | "legal_authority" | "memory_bank"

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Published", variant: "default" },
  draft: { label: "Draft", variant: "secondary" },
  archived: { label: "Archived", variant: "destructive" },
}

const ALL = "__all__"

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function LawLibraryList({
  laws,
  canManage = false,
  canCreate = false,
}: {
  laws: LawListItem[]
  canManage?: boolean
  canCreate?: boolean
}) {
  const [kind, setKind] = useState<KindFilter>("all")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState(ALL)
  const [jurisdiction, setJurisdiction] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [tag, setTag] = useState(ALL)

  const { categories, jurisdictions, tags } = useMemo(() => {
    const c = new Set<string>()
    const j = new Set<string>()
    const t = new Set<string>()
    for (const law of laws) {
      if (law.category) c.add(law.category)
      if (law.jurisdiction) j.add(law.jurisdiction)
      law.tags?.forEach((tg) => t.add(tg))
    }
    return {
      categories: [...c].sort(),
      jurisdictions: [...j].sort(),
      tags: [...t].sort(),
    }
  }, [laws])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return laws.filter((law) => {
      if (kind !== "all" && law.entryKind !== kind) return false
      if (category !== ALL && law.category !== category) return false
      if (jurisdiction !== ALL && law.jurisdiction !== jurisdiction) return false
      if (status !== ALL && law.status !== status) return false
      if (tag !== ALL && !(law.tags?.includes(tag) ?? false)) return false
      if (!q) return true
      return (
        law.title.toLowerCase().includes(q) ||
        (law.codeSection?.toLowerCase().includes(q) ?? false) ||
        (law.summary?.toLowerCase().includes(q) ?? false) ||
        (law.tags?.some((tg) => tg.toLowerCase().includes(q)) ?? false)
      )
    })
  }, [laws, kind, query, category, jurisdiction, status, tag])

  const counts = useMemo(
    () => ({
      all: laws.length,
      legal_authority: laws.filter((l) => l.entryKind === "legal_authority").length,
      memory_bank: laws.filter((l) => l.entryKind === "memory_bank").length,
    }),
    [laws],
  )

  const hasActiveFilters =
    kind !== "all" || query !== "" || category !== ALL || jurisdiction !== ALL || status !== ALL || tag !== ALL

  function clearFilters() {
    setKind("all")
    setQuery("")
    setCategory(ALL)
    setJurisdiction(ALL)
    setStatus(ALL)
    setTag(ALL)
  }

  // Empty library (nothing exists at all) — distinct from "no matches".
  if (laws.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <BookOpen className="size-8 text-muted-foreground" />
        <div>
          <h3 className="font-semibold">No entries in the Penal Code / SOP Bank yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add statutes, case law, procedural rules, or Memory Bank knowledge to get started.
          </p>
        </div>
        {canCreate && (
          <Button render={<Link href="/law-library/new" />} className="mt-2">
            <Plus className="size-4" />
            Create First Entry
          </Button>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={kind} onValueChange={(v) => setKind(v as KindFilter)}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="legal_authority">
              <BookOpen className="size-4" />
              Legal ({counts.legal_authority})
            </TabsTrigger>
            <TabsTrigger value="memory_bank">
              <Brain className="size-4" />
              Memory Bank ({counts.memory_bank})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entries..."
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={category} onValueChange={(v) => setCategory(v ?? ALL)}>
          <SelectTrigger className="w-auto min-w-36">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {titleCase(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={jurisdiction} onValueChange={(v) => setJurisdiction(v ?? ALL)}>
          <SelectTrigger className="w-auto min-w-36">
            <SelectValue placeholder="Jurisdiction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All jurisdictions</SelectItem>
            {jurisdictions.map((j) => (
              <SelectItem key={j} value={j}>
                {titleCase(j)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {tags.length > 0 && (
          <Select value={tag} onValueChange={(v) => setTag(v ?? ALL)}>
            <SelectTrigger className="w-auto min-w-32">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All tags</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {canManage && (
          <Select value={status} onValueChange={(v) => setStatus(v ?? ALL)}>
            <SelectTrigger className="w-auto min-w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="active">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="size-4" />
            Clear
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {laws.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No entries match your filters.</Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((law) => {
            const isMemory = law.entryKind === "memory_bank"
            const statusBadge = STATUS_BADGE[law.status] ?? STATUS_BADGE.draft
            return (
              <Link key={law.id} href={`/law-library/${law.id}`}>
                <Card className="cursor-pointer p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isMemory ? (
                          <Brain className="size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <FileText className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <h3 className="line-clamp-2 font-semibold">{law.title}</h3>
                        {law.aiEnabled && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Sparkles className="size-3" />
                            AI
                          </Badge>
                        )}
                        {canManage && law.status !== "active" && (
                          <Badge variant={statusBadge.variant} className="text-xs">
                            {statusBadge.label}
                          </Badge>
                        )}
                      </div>
                      {law.codeSection && <p className="mt-1 text-sm text-muted-foreground">{law.codeSection}</p>}
                      {law.summary && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{law.summary}</p>
                      )}
                      {law.tags && law.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {law.tags.slice(0, 3).map((t) => (
                            <Badge key={t} variant="secondary" className="text-xs">
                              {t}
                            </Badge>
                          ))}
                          {law.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{law.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {isMemory ? "Memory Bank" : titleCase(law.category)}
                    </Badge>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
