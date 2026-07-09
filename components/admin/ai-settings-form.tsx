"use client"

import { useState, useTransition } from "react"
import { Save, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { saveSettings } from "@/app/actions/admin"
import type { AiSettings } from "@/lib/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"

const MODELS = [
  "openai/gpt-5-mini",
  "openai/gpt-5",
  "anthropic/claude-opus-4.6",
  "google/gemini-3-flash",
]

export function AiSettingsForm({
  settings,
  roles,
}: {
  settings: AiSettings
  roles: { key: string; label: string }[]
}) {
  const [pending, startTransition] = useTransition()
  const [model, setModel] = useState(settings.model)
  const [generalPrompt, setGeneralPrompt] = useState(settings.generalPrompt)
  const [attorneyPersonality, setAttorneyPersonality] = useState(
    settings.attorneyPersonality,
  )
  const [analyzerRules, setAnalyzerRules] = useState(settings.analyzerRules)
  const [scoringRules, setScoringRules] = useState(settings.scoringRules)
  const [passThreshold, setPassThreshold] = useState(String(settings.passThreshold))
  const [checklist, setChecklist] = useState<string[]>(
    settings.requiredEvidenceChecklist,
  )
  const [newItem, setNewItem] = useState("")
  const [enabledByRole, setEnabledByRole] = useState<Record<string, boolean>>(
    settings.aiEnabledByRole,
  )
  const [memoryBankRetrieval, setMemoryBankRetrieval] = useState(settings.memoryBankRetrieval)
  const [lawLibraryRetrieval, setLawLibraryRetrieval] = useState(settings.lawLibraryRetrieval)
  const [requireCitations, setRequireCitations] = useState(settings.requireCitations)
  const [maxRetrievedEntries, setMaxRetrievedEntries] = useState(String(settings.maxRetrievedEntries))

  function addChecklistItem() {
    const v = newItem.trim()
    if (!v || checklist.includes(v)) return
    setChecklist([...checklist, v])
    setNewItem("")
  }

  function save() {
    startTransition(async () => {
      try {
        await saveSettings("ai", {
          ...settings,
          model,
          generalPrompt,
          attorneyPersonality,
          analyzerRules,
          scoringRules,
          passThreshold: Math.max(0, Math.min(100, Number(passThreshold) || 0)),
          requiredEvidenceChecklist: checklist,
          aiEnabledByRole: enabledByRole,
          memoryBankRetrieval,
          lawLibraryRetrieval,
          requireCitations,
          maxRetrievedEntries: Math.max(1, Math.min(20, Number(maxRetrievedEntries) || 5)),
        })
        toast.success("AI settings saved")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Model</CardTitle>
          <CardDescription>
            The model used for analysis, drafting, and chat. Uses the Vercel AI
            Gateway format.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="ai-model">Model identifier</FieldLabel>
            <Input
              id="ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              list="ai-model-options"
            />
            <datalist id="ai-model-options">
              {MODELS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <FieldDescription>
              e.g. {"openai/gpt-5-mini"}, {"anthropic/claude-opus-4.6"}
            </FieldDescription>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prompts &amp; Persona</CardTitle>
          <CardDescription>
            Shape the assistant&apos;s voice and how it reasons about cases.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="persona">Attorney persona</FieldLabel>
            <Textarea
              id="persona"
              rows={3}
              value={attorneyPersonality}
              onChange={(e) => setAttorneyPersonality(e.target.value)}
            />
            <FieldDescription>
              Prepended to the case assistant, plan, draft, and analysis prompts.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="general">General assistant prompt</FieldLabel>
            <Textarea
              id="general"
              rows={3}
              value={generalPrompt}
              onChange={(e) => setGeneralPrompt(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="analyzer">Analyzer rules</FieldLabel>
            <Textarea
              id="analyzer"
              rows={3}
              value={analyzerRules}
              onChange={(e) => setAnalyzerRules(e.target.value)}
            />
            <FieldDescription>
              Guides police-report and case analysis.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="scoring">Scoring rules</FieldLabel>
            <Textarea
              id="scoring"
              rows={3}
              value={scoringRules}
              onChange={(e) => setScoringRules(e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Case Scoring</CardTitle>
          <CardDescription>
            Threshold and evidence requirements applied during analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="threshold">
              Strong-position threshold (0–100)
            </FieldLabel>
            <Input
              id="threshold"
              type="number"
              min={0}
              max={100}
              value={passThreshold}
              onChange={(e) => setPassThreshold(e.target.value)}
              className="max-w-32"
            />
          </Field>
          <Field>
            <FieldLabel>Required evidence checklist</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {checklist.map((item) => (
                <Badge key={item} variant="secondary" className="gap-1.5">
                  {item}
                  <button
                    type="button"
                    onClick={() => setChecklist(checklist.filter((i) => i !== item))}
                    aria-label={`Remove ${item}`}
                    className="rounded-full hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              {checklist.length === 0 && (
                <p className="text-sm text-muted-foreground">No items yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addChecklistItem()
                  }
                }}
                placeholder="Add a required evidence item"
                className="max-w-sm"
              />
              <Button type="button" variant="outline" onClick={addChecklistItem}>
                <Plus className="size-4" />
                Add
              </Button>
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge Retrieval</CardTitle>
          <CardDescription>
            Control which knowledge sources the assistant may pull in as grounded,
            cited context. Only entries marked AI-enabled and active are eligible.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="pr-4">
              <p className="text-sm font-medium">Memory Bank</p>
              <p className="text-sm text-muted-foreground">
                Internal SOPs, policies, training material, and custom knowledge.
              </p>
            </div>
            <Switch checked={memoryBankRetrieval} onCheckedChange={setMemoryBankRetrieval} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="pr-4">
              <p className="text-sm font-medium">Penal Code / SOP Bank</p>
              <p className="text-sm text-muted-foreground">
                Statutes, case law, and procedural rules from the law library.
              </p>
            </div>
            <Switch checked={lawLibraryRetrieval} onCheckedChange={setLawLibraryRetrieval} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="pr-4">
              <p className="text-sm font-medium">Require citations</p>
              <p className="text-sm text-muted-foreground">
                Instruct the assistant to cite retrieved sources inline by number.
              </p>
            </div>
            <Switch checked={requireCitations} onCheckedChange={setRequireCitations} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="pr-4">
              <p className="text-sm font-medium">Max retrieved entries</p>
              <p className="text-sm text-muted-foreground">
                How many knowledge entries the assistant may pull in per request (1–20).
              </p>
            </div>
            <Input
              type="number"
              min={1}
              max={20}
              value={maxRetrievedEntries}
              onChange={(e) => setMaxRetrievedEntries(e.target.value)}
              className="w-20"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Access by Role</CardTitle>
          <CardDescription>
            Control which roles can use AI analysis, drafting, and chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {roles.map((role) => (
            <div
              key={role.key}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <span className="text-sm font-medium">{role.label}</span>
              <Switch
                checked={enabledByRole[role.key] ?? true}
                onCheckedChange={(checked) =>
                  setEnabledByRole({ ...enabledByRole, [role.key]: checked })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          <Save className="size-4" />
          {pending ? "Saving…" : "Save AI settings"}
        </Button>
      </div>
    </div>
  )
}
