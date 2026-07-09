"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  FileText,
  Scale,
  FolderSearch,
  Clock,
  Gavel,
  ShieldAlert,
  PenLine,
  ExternalLink,
  Lock,
  BookOpen,
  Users,
  Sparkles,
} from "lucide-react"
import type { ProsecutionAnalysisResult } from "@/app/actions/prosecution-analysis"
import type { CaseAnalysisResult } from "@/app/actions/analysis"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProsecutionAiPanel } from "@/components/prosecution/prosecution-ai-panel"

type AnyRow = Record<string, any>

interface SharedCaseFileProps {
  caseItem: AnyRow
  isOwnCase: boolean
  sections: Record<string, boolean>
  canViewEvidence: boolean
  canViewDefenseNotes: boolean
  charges: AnyRow[]
  pleas: AnyRow[]
  witnesses: AnyRow[]
  evidence: AnyRow[]
  timeline: AnyRow[]
  deadlines: AnyRow[]
  motions: AnyRow[]
  warrants: AnyRow[]
  policeReports: AnyRow[]
  lawLinks: AnyRow[]
  defenseAi: { id: string; createdAt: Date | string; result: CaseAnalysisResult } | null
  prosecutionAi: { id: string; createdAt: Date | string; result: ProsecutionAnalysisResult } | null
  canUseAi: boolean
}

const STATUS_COLORS: Record<string, string> = {
  intake: "bg-slate-100 text-slate-800",
  investigation: "bg-blue-100 text-blue-800",
  charged: "bg-yellow-100 text-yellow-800",
  pre_trial: "bg-indigo-100 text-indigo-800",
  plea_negotiation: "bg-purple-100 text-purple-800",
  trial: "bg-orange-100 text-orange-800",
  trial_prep: "bg-orange-100 text-orange-800",
  appeal: "bg-pink-100 text-pink-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-red-100 text-red-800",
  closed: "bg-gray-200 text-gray-700",
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "Not set"
  return new Date(d).toLocaleDateString()
}

export function SharedCaseFile(props: SharedCaseFileProps) {
  const { caseItem, sections, isOwnCase } = props
  const [tab, setTab] = useState("overview")

  const rulings = props.warrants.filter((w) => w.decidedAt)

  const tabs: { value: string; label: string; icon: React.ElementType; show: boolean }[] = [
    { value: "overview", label: "Overview", icon: FileText, show: sections.overview },
    { value: "charges", label: "Charges", icon: Scale, show: sections.charges },
    { value: "evidence", label: "Evidence", icon: FolderSearch, show: sections.evidence && props.canViewEvidence },
    { value: "timeline", label: "Timeline", icon: Clock, show: sections.timeline || sections.courtDates },
    { value: "filings", label: "Motions & Warrants", icon: PenLine, show: sections.motions || sections.warrants || sections.rulings },
    { value: "reports", label: "Reports & Law", icon: BookOpen, show: sections.policeReports || sections.lawLibrary },
    { value: "ai", label: "Prosecution AI", icon: Gavel, show: true },
  ].filter((t) => t.show)

  return (
    <div className="flex flex-col">
      <div className="border-b border-border px-4 py-5 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          className="mb-3 -ml-2 text-muted-foreground"
          render={<Link href="/prosecution/cases" />}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to Cases
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-pretty text-xl font-semibold tracking-tight sm:text-2xl">
                {caseItem.title}
              </h1>
              <Badge variant="outline" className="capitalize">
                {isOwnCase ? "Prosecution" : "Defense"} case
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {caseItem.caseNumber} · Defendant: {caseItem.defendantName || caseItem.clientName || "Unknown"}
            </p>
          </div>
          {sections.status && (
            <Badge className={STATUS_COLORS[caseItem.status] || "bg-gray-100 text-gray-800"}>
              {String(caseItem.status).replace(/_/g, " ")}
            </Badge>
          )}
        </div>
        {!isOwnCase && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" />
            Shared case file. Civilian intake data and private defense strategy are not shown unless an
            admin has shared them.
          </p>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v ?? "overview")} className="gap-0">
        <div className="overflow-x-auto border-b border-border px-4 sm:px-6 lg:px-8">
          <TabsList className="h-auto bg-transparent p-0">
            {tabs.map((t) => {
              const Icon = t.icon
              return (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="gap-1.5 flex-none rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-3 py-3 data-active:border-primary data-active:bg-transparent dark:data-active:bg-transparent"
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="p-6 lg:col-span-2 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <Field label="Case Number" value={caseItem.caseNumber} />
                  <Field label="Defendant" value={caseItem.defendantName || caseItem.clientName || "Unknown"} />
                  <Field label="Agency" value={caseItem.arrestingAgency || "Unknown"} />
                  <Field label="Priority" value={String(caseItem.priority || "normal")} className="capitalize" />
                  {sections.courtDates && (
                    <Field label="Court Date" value={fmtDate(caseItem.courtDate)} />
                  )}
                  <Field label="Type" value={String(caseItem.caseType || "criminal")} className="capitalize" />
                </div>
                {caseItem.incidentNarrative && (
                  <div className="border-t pt-4">
                    <p className="mb-1 text-sm font-medium">Incident Narrative</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {caseItem.incidentNarrative}
                    </p>
                  </div>
                )}
                {caseItem.probableCause && (
                  <div className="border-t pt-4">
                    <p className="mb-1 text-sm font-medium">Probable Cause</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {caseItem.probableCause}
                    </p>
                  </div>
                )}
                {props.canViewDefenseNotes && caseItem.notes && (
                  <div className="border-t pt-4">
                    <p className="mb-1 text-sm font-medium">Notes</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{caseItem.notes}</p>
                  </div>
                )}
              </Card>

              <div className="space-y-6">
                {props.witnesses.length > 0 && (
                  <Card className="p-6">
                    <h2 className="mb-3 flex items-center gap-2 font-semibold">
                      <Users className="size-4 text-primary" />
                      Witnesses ({props.witnesses.length})
                    </h2>
                    <div className="space-y-3">
                      {props.witnesses.map((w) => (
                        <div key={w.id} className="border-b pb-2 text-sm last:border-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{w.name}</p>
                            <Badge variant="outline" className="capitalize">
                              {w.role}
                            </Badge>
                          </div>
                          {w.contact && <p className="text-muted-foreground">{w.contact}</p>}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
                {!props.canViewDefenseNotes && !isOwnCase && (
                  <Card className="p-6">
                    <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Lock className="size-4 text-muted-foreground" />
                      Restricted
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Internal defense strategy notes, attorney-client privileged notes, civilian
                      intake requests, and civilian messages are not available to the prosecution
                      unless an admin shares them.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Charges */}
          <TabsContent value="charges">
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="mb-4 font-semibold">Charges ({props.charges.length})</h2>
                {props.charges.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {caseItem.charges ? caseItem.charges : "No charges recorded."}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {props.charges.map((c) => (
                      <div key={c.id} className="flex items-start justify-between gap-2 border-b pb-3 last:border-0">
                        <div>
                          <p className="font-medium">{c.statute}</p>
                          {c.description && (
                            <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <Badge variant="secondary" className="capitalize">
                            {c.severity}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {c.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {props.pleas.length > 0 && (
                <Card className="p-6">
                  <h2 className="mb-4 font-semibold">Plea Offers ({props.pleas.length})</h2>
                  <div className="space-y-3">
                    {props.pleas.map((p) => (
                      <div key={p.id} className="flex items-start justify-between gap-2 border-b pb-3 last:border-0">
                        <div>
                          <p className="font-medium">{p.terms}</p>
                          {p.recommendedSentence && (
                            <p className="text-sm text-muted-foreground">Recommended: {p.recommendedSentence}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {p.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Evidence */}
          <TabsContent value="evidence">
            <Card className="p-6">
              <h2 className="mb-4 font-semibold">Evidence Locker ({props.evidence.length})</h2>
              {props.evidence.length === 0 ? (
                <p className="text-sm text-muted-foreground">No shared evidence.</p>
              ) : (
                <div className="space-y-3">
                  {props.evidence.map((e) => (
                    <div key={e.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{e.title}</p>
                          {e.description && (
                            <p className="mt-0.5 text-sm text-muted-foreground">{e.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="shrink-0 capitalize">
                          {String(e.evidenceType).replace(/_/g, " ")}
                        </Badge>
                      </div>
                      {e.link && (
                        <a
                          href={e.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="size-3.5" />
                          Open
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Timeline & court dates */}
          <TabsContent value="timeline">
            <div className="space-y-6">
              {sections.courtDates && props.deadlines.length > 0 && (
                <Card className="p-6">
                  <h2 className="mb-4 font-semibold">Court Dates & Deadlines</h2>
                  <div className="space-y-2">
                    {props.deadlines.map((d) => (
                      <div key={d.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                        <span>{d.label}</span>
                        <span className="text-muted-foreground">{fmtDate(d.dueDate)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {sections.timeline && (
                <Card className="p-6">
                  <h2 className="mb-4 font-semibold">Timeline ({props.timeline.length})</h2>
                  {props.timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No timeline events.</p>
                  ) : (
                    <div className="space-y-3">
                      {props.timeline.map((t) => (
                        <div key={t.id} className="flex gap-3 border-b pb-3 text-sm last:border-0">
                          <span className="shrink-0 text-muted-foreground">{fmtDate(t.date)}</span>
                          <div>
                            <p className="font-medium">{t.title}</p>
                            {t.description && <p className="text-muted-foreground">{t.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Motions, warrants, rulings */}
          <TabsContent value="filings">
            <div className="space-y-6">
              {sections.motions && (
                <Card className="p-6">
                  <h2 className="mb-4 font-semibold">Motions & Drafts ({props.motions.length})</h2>
                  {props.motions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No motions filed.</p>
                  ) : (
                    <div className="space-y-2">
                      {props.motions.map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-2 border-b pb-2 text-sm last:border-0">
                          <span className="font-medium">{m.title}</span>
                          <Badge variant="outline" className="capitalize">
                            {String(m.type).replace(/_/g, " ")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
              {sections.warrants && (
                <Card className="p-6">
                  <h2 className="mb-4 font-semibold">Warrants ({props.warrants.length})</h2>
                  {props.warrants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No linked warrants.</p>
                  ) : (
                    <div className="space-y-2">
                      {props.warrants.map((w) => (
                        <div key={w.id} className="flex items-center justify-between gap-2 border-b pb-2 text-sm last:border-0">
                          <div>
                            <p className="font-medium">{w.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {w.warrantNumber} · {String(w.warrantType)}
                            </p>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {String(w.status).replace(/_/g, " ")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
              {sections.rulings && (
                <Card className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 font-semibold">
                    <Gavel className="size-4 text-primary" />
                    Judicial Rulings ({rulings.length})
                  </h2>
                  {rulings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No judicial rulings yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {rulings.map((w) => (
                        <div key={w.id} className="border-b pb-3 text-sm last:border-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{w.title}</p>
                            <Badge variant="outline" className="capitalize">
                              {String(w.status).replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {w.judgeName ? `${w.judgeName} · ` : ""}
                            {fmtDate(w.decidedAt)}
                          </p>
                          {(w.judgeNotes || w.denyReason) && (
                            <p className="mt-1 text-muted-foreground">{w.judgeNotes || w.denyReason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Reports & law */}
          <TabsContent value="reports">
            <div className="space-y-6">
              {sections.policeReports && (
                <Card className="p-6">
                  <h2 className="mb-4 font-semibold">Police Reports ({props.policeReports.length})</h2>
                  {props.policeReports.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No linked police reports.</p>
                  ) : (
                    <div className="space-y-3">
                      {props.policeReports.map((r) => (
                        <div key={r.id} className="border-b pb-3 text-sm last:border-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{r.title}</p>
                            <Badge variant="outline" className="capitalize">
                              {String(r.status).replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {r.reportNumber} · {r.agency || "Unknown agency"}
                          </p>
                          {r.proposedCharges && (
                            <p className="mt-1 text-muted-foreground">Charges: {r.proposedCharges}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
              {sections.lawLibrary && (
                <Card className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 font-semibold">
                    <BookOpen className="size-4 text-primary" />
                    Penal Code / SOP Bank Links
                  </h2>
                  {props.lawLinks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No statutes linked to this case&apos;s charges.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {props.lawLinks.map((l) => (
                        <Link
                          key={l.id}
                          href={`/law-library/${l.id}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm transition-colors hover:bg-muted"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">{l.title}</p>
                            {l.codeSection && <p className="text-xs text-muted-foreground">{l.codeSection}</p>}
                          </div>
                          <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Prosecution AI */}
          <TabsContent value="ai">
            <div className="space-y-6">
              <ProsecutionAiPanel
                caseId={caseItem.id}
                canUse={props.canUseAi}
                analysis={props.prosecutionAi}
              />
              {props.defenseAi && (
                <Card className="p-6">
                  <h2 className="mb-2 flex items-center gap-2 font-semibold">
                    <Sparkles className="size-4 text-muted-foreground" />
                    Shared Defense Analysis
                  </h2>
                  <p className="text-sm text-muted-foreground">{props.defenseAi.result.summary}</p>
                </Card>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function Field({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className={`font-medium ${className ?? ""}`}>{value}</p>
    </div>
  )
}
