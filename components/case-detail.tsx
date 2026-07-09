"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  FileText,
  Clock,
  FolderSearch,
  MessageSquare,
  Sparkles,
  ListChecks,
  PenLine,
  Scale,
  ShieldAlert,
  UserCircle,
} from "lucide-react"
import type { Role } from "@/lib/constants"
import { labelOf, CASE_TYPES, hasPerm } from "@/lib/constants"
import type { CaseAnalysisResult } from "@/app/actions/analysis"
import type { TeamMember } from "@/app/actions/team"
import type { CaseMessageRow } from "@/app/actions/case-chat"
import type { CaseClientPanelData } from "@/lib/case-clients"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { StatusBadge, PriorityBadge } from "@/components/case-badges"
import { DetailsTab } from "@/components/case-tabs/details-tab"
import { EvidenceTab } from "@/components/case-tabs/evidence-tab"
import { TimelineTab } from "@/components/case-tabs/timeline-tab"
import { CaseChatTab } from "@/components/case-tabs/chat-tab"
import { AnalysisTab } from "@/components/case-tabs/analysis-tab"
import { PlanTab } from "@/components/case-tabs/plan-tab"
import { DraftsTab } from "@/components/case-tabs/drafts-tab"
import { MotionsTab, type CaseMotionItem } from "@/components/case-tabs/motions-tab"
import { ClientPortalTab } from "@/components/case-tabs/client-portal-tab"
import { CaseClosureControls } from "@/components/case-closure-controls"

type AnyRow = Record<string, unknown>

interface CaseDetailProps {
  role: Role
  permissions: string[]
  caseData: AnyRow & {
    id: string
    title: string
    caseNumber: string
    clientName: string
    charges: string | null
    caseType: string
    priority: string
    status: string
    notes: string | null
    strategySummary: string | null
    conflictFlag: boolean
    attorneyName: string | null
    paralegalName: string | null
    assignedAttorneyId: string | null
    assignedParalegalId: string | null
    closureRequested?: boolean
    closureReason?: string | null
    closedAt?: Date | string | null
  }
  evidence: AnyRow[]
  timeline: AnyRow[]
  plan: AnyRow[]
  drafts: AnyRow[]
  deadlines: AnyRow[]
  messages: CaseMessageRow[]
  analysis: { id: string; createdAt: Date; result: CaseAnalysisResult } | null
  team: TeamMember[]
  clientPanel: CaseClientPanelData
  motions?: CaseMotionItem[]
  motionBasePath?: string
  motionNewHref?: string
  motionTypeOptions?: { value: string; label: string }[]
  motionStatusLabels?: Record<string, string>
}

export function CaseDetail(props: CaseDetailProps) {
  const { caseData, role, permissions, clientPanel } = props
  const [tab, setTab] = useState("details")
  const canManageAccess = hasPerm(permissions, "case:edit")

  const TABS = [
    { value: "details", label: "Details", icon: FileText },
    { value: "timeline", label: "Timeline", icon: Clock },
    { value: "evidence", label: "Evidence", icon: FolderSearch },
    { value: "chat", label: "Case Chat", icon: MessageSquare },
    { value: "analysis", label: "AI Analysis", icon: Sparkles },
    { value: "plan", label: "Case Plan", icon: ListChecks },
    ...(props.motions ? [{ value: "motions", label: "Motions", icon: Scale }] : []),
    { value: "drafts", label: "Drafts", icon: PenLine },
    { value: "client", label: "Informant Portal", icon: UserCircle },
  ]

  return (
    <div className="flex flex-col">
      <div className="border-b border-border px-4 py-5 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          className="mb-3 -ml-2 text-muted-foreground"
          render={<Link href="/cases" />}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to Cases
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-pretty text-xl font-semibold tracking-tight sm:text-2xl">
                {caseData.title}
              </h1>
              {caseData.conflictFlag && (
                <span className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-300">
                  <ShieldAlert className="size-3" />
                  Conflict
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {caseData.caseNumber} · {caseData.clientName} ·{" "}
              {labelOf(CASE_TYPES, caseData.caseType)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PriorityBadge priority={caseData.priority} />
            <StatusBadge status={caseData.status} />
          </div>
        </div>
        <div className="mt-4">
          <CaseClosureControls
            caseId={caseData.id}
            status={caseData.status}
            canEdit={canManageAccess}
            closureRequested={caseData.closureRequested ?? false}
            closureReason={caseData.closureReason ?? null}
            closedAt={caseData.closedAt ?? null}
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v ?? "details")} className="gap-0">
        <div className="overflow-x-auto border-b border-border px-4 sm:px-6 lg:px-8">
          <TabsList className="h-auto bg-transparent p-0">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-3 data-[selected]:border-primary"
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <TabsContent value="details">
            <DetailsTab role={role} caseData={props.caseData} deadlines={props.deadlines} team={props.team} />
          </TabsContent>
          <TabsContent value="timeline">
            <TimelineTab role={role} caseId={caseData.id} timeline={props.timeline} />
          </TabsContent>
          <TabsContent value="evidence">
            <EvidenceTab role={role} caseId={caseData.id} evidence={props.evidence} />
          </TabsContent>
          <TabsContent value="chat">
            <CaseChatTab caseId={caseData.id} initialMessages={props.messages} />
          </TabsContent>
          <TabsContent value="analysis">
            <AnalysisTab role={role} caseId={caseData.id} analysis={props.analysis} />
          </TabsContent>
          <TabsContent value="plan">
            <PlanTab role={role} caseId={caseData.id} plan={props.plan} />
          </TabsContent>
          {props.motions ? (
            <TabsContent value="motions">
              <MotionsTab
                motions={props.motions}
                basePath={props.motionBasePath ?? "/motions"}
                newHref={props.motionNewHref ?? "/motions/new"}
                canFile={hasPerm(permissions, "motion:file") && Boolean(props.motionNewHref)}
                typeOptions={props.motionTypeOptions ?? []}
                statusLabels={props.motionStatusLabels ?? {}}
              />
            </TabsContent>
          ) : null}
          <TabsContent value="drafts">
            <DraftsTab role={role} caseId={caseData.id} drafts={props.drafts} />
          </TabsContent>
          <TabsContent value="client">
            <ClientPortalTab
              caseId={caseData.id}
              clients={clientPanel.clients}
              evidenceItems={clientPanel.evidenceItems}
              draftItems={clientPanel.draftItems}
              analysisItems={clientPanel.analysisItems}
              canManageAccess={canManageAccess}
              canShareEvidence={hasPerm(permissions, "evidence:manage")}
              canShareDrafts={hasPerm(permissions, "draft:manage")}
              canShareAnalysis={hasPerm(permissions, "ai:use")}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
