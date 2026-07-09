"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserCircle, ShieldCheck, FolderSearch, PenLine, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  updateCivilianAccess,
  setEvidenceShared,
  setDraftShared,
  setAnalysisShared,
} from "@/app/actions/intake"
import type {
  CaseClientAccess,
  ShareableItem,
} from "@/lib/case-clients"

type AccessFlag =
  | "canViewStatus"
  | "canViewCourtDates"
  | "canViewEvidence"
  | "canSendMessages"
  | "canAddEvidence"
  | "canViewDrafts"
  | "canViewAiSummaries"
  | "canViewNotes"

const ACCESS_FLAGS: { key: AccessFlag; label: string; help: string }[] = [
  { key: "canViewStatus", label: "Case status", help: "Show the current case status and progress." },
  { key: "canViewCourtDates", label: "Court dates & deadlines", help: "Show upcoming court dates and filing deadlines." },
  { key: "canViewEvidence", label: "Shared evidence", help: "Allow viewing evidence items you mark as shared." },
  { key: "canAddEvidence", label: "Submit evidence", help: "Let the client add evidence links to the case." },
  { key: "canViewDrafts", label: "Shared documents", help: "Allow viewing drafts you mark as shared." },
  { key: "canViewAiSummaries", label: "Shared case summaries", help: "Allow viewing AI summaries you mark as shared." },
  { key: "canSendMessages", label: "Secure messaging", help: "Let the client message the legal team." },
]

interface Props {
  caseId: string
  clients: CaseClientAccess[]
  evidenceItems: ShareableItem[]
  draftItems: ShareableItem[]
  analysisItems: ShareableItem[]
  canManageAccess: boolean
  canShareEvidence: boolean
  canShareDrafts: boolean
  canShareAnalysis: boolean
}

export function ClientPortalTab({
  caseId,
  clients,
  evidenceItems,
  draftItems,
  analysisItems,
  canManageAccess,
  canShareEvidence,
  canShareDrafts,
  canShareAnalysis,
}: Props) {
  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <UserCircle className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No client linked to this case</p>
          <p className="max-w-sm text-pretty text-sm text-muted-foreground">
            Clients are linked automatically when their intake request is converted
            into a case. Once linked, you can manage their portal access here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {clients.map((client) => (
        <ClientAccessCard
          key={client.civilianId}
          caseId={caseId}
          client={client}
          canManageAccess={canManageAccess}
        />
      ))}

      <div className="grid gap-6 md:grid-cols-3">
        <ShareCard
          title="Evidence"
          icon={FolderSearch}
          items={evidenceItems}
          disabled={!canShareEvidence}
          onToggle={(id, shared) => setEvidenceShared(id, caseId, shared)}
          emptyText="No evidence on this case yet."
        />
        <ShareCard
          title="Documents & Drafts"
          icon={PenLine}
          items={draftItems}
          disabled={!canShareDrafts}
          onToggle={(id, shared) => setDraftShared(id, caseId, shared)}
          emptyText="No drafts on this case yet."
        />
        <ShareCard
          title="AI Summaries"
          icon={Sparkles}
          items={analysisItems}
          disabled={!canShareAnalysis}
          onToggle={(id, shared) => setAnalysisShared(id, caseId, shared)}
          emptyText="No AI analyses on this case yet."
        />
      </div>
    </div>
  )
}

function ClientAccessCard({
  caseId,
  client,
  canManageAccess,
}: {
  caseId: string
  client: CaseClientAccess
  canManageAccess: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [flags, setFlags] = useState<Record<AccessFlag, boolean>>({
    canViewStatus: client.canViewStatus,
    canViewCourtDates: client.canViewCourtDates,
    canViewEvidence: client.canViewEvidence,
    canSendMessages: client.canSendMessages,
    canAddEvidence: client.canAddEvidence,
    canViewDrafts: client.canViewDrafts,
    canViewAiSummaries: client.canViewAiSummaries,
    canViewNotes: client.canViewNotes,
  })

  function toggle(key: AccessFlag, value: boolean) {
    const prev = flags[key]
    setFlags((f) => ({ ...f, [key]: value }))
    startTransition(async () => {
      try {
        await updateCivilianAccess(caseId, client.civilianId, { [key]: value })
        router.refresh()
      } catch (e) {
        setFlags((f) => ({ ...f, [key]: prev }))
        toast.error(e instanceof Error ? e.message : "Failed to update access")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-primary" />
          Portal Access — {client.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{client.email}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {ACCESS_FLAGS.map((f) => (
          <label
            key={f.key}
            className="flex items-center justify-between gap-4 rounded-lg px-2 py-2.5 hover:bg-muted/40"
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{f.label}</span>
              <span className="text-xs text-muted-foreground">{f.help}</span>
            </span>
            <Switch
              checked={flags[f.key]}
              onCheckedChange={(v) => toggle(f.key, v === true)}
              disabled={!canManageAccess}
              aria-label={f.label}
            />
          </label>
        ))}
      </CardContent>
    </Card>
  )
}

function ShareCard({
  title,
  icon: Icon,
  items,
  disabled,
  onToggle,
  emptyText,
}: {
  title: string
  icon: typeof FolderSearch
  items: ShareableItem[]
  disabled: boolean
  onToggle: (id: string, shared: boolean) => Promise<void>
  emptyText: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((i) => [i.id, i.sharedWithCivilian])),
  )
  const sharedCount = Object.values(state).filter(Boolean).length

  function toggle(id: string, value: boolean) {
    const prev = state[id]
    setState((s) => ({ ...s, [id]: value }))
    startTransition(async () => {
      try {
        await onToggle(id, value)
        router.refresh()
      } catch (e) {
        setState((s) => ({ ...s, [id]: prev }))
        toast.error(e instanceof Error ? e.message : "Failed to update sharing")
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
        {items.length > 0 && (
          <Badge variant="secondary" className="tabular-nums">
            {sharedCount} shared
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-muted/40"
              >
                <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                <Switch
                  checked={state[item.id] ?? false}
                  onCheckedChange={(v) => toggle(item.id, v === true)}
                  disabled={disabled}
                  aria-label={`Share ${item.label} with client`}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
