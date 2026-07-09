"use client"

import { useState, useTransition } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { saveSettings } from "@/app/actions/admin"
import type { CivilianSettings } from "@/lib/settings"
import {
  INTAKE_STATUSES,
  INTAKE_URGENCY_LEVELS,
  INTAKE_CONTACT_FIELDS,
  INTAKE_CIVIL_FIELDS,
  INTAKE_CRIMINAL_FIELDS,
  STAFF_ROLES,
  ROLE_LABELS,
  type IntakeFieldDef,
} from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type FieldRule = { enabled: boolean; required: boolean }

const ACCESS_FLAGS: { key: keyof CivilianSettings["defaultAccess"]; label: string }[] = [
  { key: "canViewStatus", label: "View case status" },
  { key: "canViewCourtDates", label: "View court dates & deadlines" },
  { key: "canViewEvidence", label: "View shared evidence" },
  { key: "canAddEvidence", label: "Submit evidence" },
  { key: "canViewDrafts", label: "View shared documents" },
  { key: "canViewAiSummaries", label: "View shared AI summaries" },
  { key: "canSendMessages", label: "Send secure messages" },
]

export function ClientPortalSettingsForm({ settings }: { settings: CivilianSettings }) {
  const [pending, startTransition] = useTransition()

  const [registrationEnabled, setRegistrationEnabled] = useState(settings.registrationEnabled)
  const [requestCivil, setRequestCivil] = useState(settings.requestTypes.civil)
  const [requestCriminal, setRequestCriminal] = useState(settings.requestTypes.criminal)
  const [welcomeMessage, setWelcomeMessage] = useState(settings.welcomeMessage)
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>(settings.statusLabels ?? {})
  const [urgencyLabels, setUrgencyLabels] = useState<Record<string, string>>(settings.urgencyLabels ?? {})
  const [reviewerRoles, setReviewerRoles] = useState<string[]>(settings.reviewerRoles ?? [])
  const [defaultAccess, setDefaultAccess] = useState(settings.defaultAccess)
  const [fieldConfig, setFieldConfig] = useState<Record<string, Record<string, FieldRule>>>(
    settings.fieldConfig ?? {},
  )

  function ruleFor(type: string, f: IntakeFieldDef): FieldRule {
    return (
      fieldConfig[type]?.[f.key] ?? { enabled: f.defaultEnabled, required: f.defaultRequired }
    )
  }

  function setRule(type: string, key: string, patch: Partial<FieldRule>) {
    setFieldConfig((prev) => {
      const forType = { ...(prev[type] ?? {}) }
      const existing = forType[key] ?? { enabled: true, required: false }
      forType[key] = { ...existing, ...patch }
      return { ...prev, [type]: forType }
    })
  }

  function toggleReviewerRole(role: string, on: boolean) {
    setReviewerRoles((prev) =>
      on ? [...new Set([...prev, role])] : prev.filter((r) => r !== role),
    )
  }

  function save() {
    startTransition(async () => {
      try {
        await saveSettings("civilian", {
          registrationEnabled,
          requestTypes: { civil: requestCivil, criminal: requestCriminal },
          welcomeMessage,
          statusLabels,
          customStatuses: settings.customStatuses ?? [],
          urgencyLabels,
          fieldConfig,
          reviewerRoles,
          defaultAccess,
        })
        toast.success("Client portal settings saved")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Access & request types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portal Access</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex items-center justify-between gap-4">
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Allow client self-registration</span>
              <span className="text-xs text-muted-foreground">
                Let new clients create their own portal accounts.
              </span>
            </span>
            <Switch checked={registrationEnabled} onCheckedChange={(v) => setRegistrationEnabled(v === true)} />
          </label>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Request types clients may submit</p>
            <Label className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm font-normal">
              <Checkbox checked={requestCivil} onCheckedChange={(v) => setRequestCivil(Boolean(v))} />
              Civil lawsuit intake
            </Label>
            <Label className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm font-normal">
              <Checkbox checked={requestCriminal} onCheckedChange={(v) => setRequestCriminal(Boolean(v))} />
              Criminal charge intake
            </Label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="welcome">Portal welcome message</Label>
            <Textarea
              id="welcome"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={2}
              placeholder="Shown on the client dashboard."
            />
          </div>
        </CardContent>
      </Card>

      {/* Reviewer roles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Intake Reviewers</CardTitle>
          <p className="text-sm text-muted-foreground">
            Which staff roles can be assigned to review and triage intake requests.
          </p>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {STAFF_ROLES.map((role) => (
            <Label
              key={role}
              className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm font-normal"
            >
              <Checkbox
                checked={reviewerRoles.includes(role)}
                onCheckedChange={(v) => toggleReviewerRole(role, Boolean(v))}
              />
              {ROLE_LABELS[role]}
            </Label>
          ))}
        </CardContent>
      </Card>

      {/* Default access on conversion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default Client Access</CardTitle>
          <p className="text-sm text-muted-foreground">
            Applied automatically when an intake is converted into a case. Staff can
            adjust per case afterward.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {ACCESS_FLAGS.map((f) => (
            <label
              key={f.key}
              className="flex items-center justify-between gap-4 rounded-lg px-2 py-2 hover:bg-muted/40"
            >
              <span className="text-sm">{f.label}</span>
              <Switch
                checked={defaultAccess[f.key]}
                onCheckedChange={(v) =>
                  setDefaultAccess((a) => ({ ...a, [f.key]: v === true }))
                }
              />
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Status & urgency labels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status & Urgency Labels</CardTitle>
          <p className="text-sm text-muted-foreground">
            Override the client-facing wording for workflow statuses and urgency levels.
          </p>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Statuses</p>
            {INTAKE_STATUSES.map((s) => (
              <div key={s.value} className="flex items-center gap-2">
                <span className="w-40 shrink-0 text-xs text-muted-foreground">{s.label}</span>
                <Input
                  value={statusLabels[s.value] ?? ""}
                  placeholder={s.label}
                  onChange={(e) =>
                    setStatusLabels((m) => ({ ...m, [s.value]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Urgency levels</p>
            {INTAKE_URGENCY_LEVELS.map((u) => (
              <div key={u.value} className="flex items-center gap-2">
                <span className="w-40 shrink-0 text-xs text-muted-foreground">{u.label}</span>
                <Input
                  value={urgencyLabels[u.value] ?? ""}
                  placeholder={u.label}
                  onChange={(e) =>
                    setUrgencyLabels((m) => ({ ...m, [u.value]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Intake form field configuration */}
      <FieldConfigCard
        title="Civil Intake Fields"
        type="civil"
        fields={[...INTAKE_CONTACT_FIELDS, ...INTAKE_CIVIL_FIELDS]}
        ruleFor={ruleFor}
        setRule={setRule}
      />
      <FieldConfigCard
        title="Criminal Intake Fields"
        type="criminal"
        fields={[...INTAKE_CONTACT_FIELDS, ...INTAKE_CRIMINAL_FIELDS]}
        ruleFor={ruleFor}
        setRule={setRule}
      />

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={pending} className="shadow-lg">
          <Save className="size-4" data-icon />
          {pending ? "Saving…" : "Save All Settings"}
        </Button>
      </div>
    </div>
  )
}

function FieldConfigCard({
  title,
  type,
  fields,
  ruleFor,
  setRule,
}: {
  title: string
  type: string
  fields: IntakeFieldDef[]
  ruleFor: (type: string, f: IntakeFieldDef) => FieldRule
  setRule: (type: string, key: string, patch: Partial<FieldRule>) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Toggle which questions appear on the form and whether they are required.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col divide-y divide-border">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span>Field</span>
            <span className="w-16 text-center">Shown</span>
            <span className="w-16 text-center">Required</span>
          </div>
          {fields.map((f) => {
            const rule = ruleFor(type, f)
            return (
              <div key={f.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-2.5">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {f.label}
                    {f.locked && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">(required core field)</span>
                    )}
                  </span>
                </div>
                <div className="flex w-16 justify-center">
                  <Switch
                    checked={f.locked ? true : rule.enabled}
                    disabled={f.locked}
                    onCheckedChange={(v) => setRule(type, f.key, { enabled: v === true })}
                    aria-label={`Show ${f.label}`}
                  />
                </div>
                <div className="flex w-16 justify-center">
                  <Switch
                    checked={f.locked ? true : rule.required}
                    disabled={f.locked || !rule.enabled}
                    onCheckedChange={(v) => setRule(type, f.key, { required: v === true })}
                    aria-label={`Require ${f.label}`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
