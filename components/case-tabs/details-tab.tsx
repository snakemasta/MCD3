"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Save, UserCog, CalendarPlus, Trash2, Check, Wand2 } from "lucide-react"
import type { Role } from "@/lib/constants"
import {
  can,
  CASE_STATUSES,
  CASE_PRIORITIES,
  COUNSEL_ROLES,
  labelOf,
} from "@/lib/constants"
import type { TeamMember } from "@/app/actions/team"
import { updateCase, assignCase, suggestAssignment } from "@/app/actions/cases"
import { addDeadline, toggleDeadline, deleteDeadline } from "@/app/actions/deadlines"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const UNASSIGNED = "__unassigned__"

interface DetailsTabProps {
  role: Role
  caseData: Record<string, unknown> & {
    id: string
    title: string
    clientName: string
    charges: string | null
    priority: string
    status: string
    notes: string | null
    assignedAttorneyId: string | null
    assignedParalegalId: string | null
  }
  deadlines: Record<string, unknown>[]
  team: TeamMember[]
}

export function DetailsTab({ role, caseData, deadlines, team }: DetailsTabProps) {
  const router = useRouter()
  const canEdit = can(role, "case:edit")
  const canAssign = can(role, "case:assign")

  const [title, setTitle] = useState(caseData.title)
  const [clientName, setClientName] = useState(caseData.clientName)
  const [charges, setCharges] = useState(caseData.charges ?? "")
  const [priority, setPriority] = useState(caseData.priority)
  const [status, setStatus] = useState(caseData.status)
  const [notes, setNotes] = useState(caseData.notes ?? "")
  const [saving, setSaving] = useState(false)

  const [attorneyId, setAttorneyId] = useState(
    caseData.assignedAttorneyId ?? UNASSIGNED,
  )
  const [paralegalId, setParalegalId] = useState(
    caseData.assignedParalegalId ?? UNASSIGNED,
  )

  const [newDeadline, setNewDeadline] = useState("")
  const [newDeadlineDate, setNewDeadlineDate] = useState("")

  const counsel = team.filter((m) => COUNSEL_ROLES.includes(m.role) || m.role === "admin")
  const paralegals = team.filter(
    (m) => m.role === "paralegal" || m.role === "admin",
  )

  const statusItems = Object.fromEntries(CASE_STATUSES.map((s) => [s.value, s.label]))
  const priorityItems = Object.fromEntries(CASE_PRIORITIES.map((p) => [p.value, p.label]))
  const counselItems: Record<string, string> = {
    [UNASSIGNED]: "Unassigned",
    ...Object.fromEntries(counsel.map((m) => [m.userId, m.name])),
  }
  const paralegalItems: Record<string, string> = {
    [UNASSIGNED]: "Unassigned",
    ...Object.fromEntries(paralegals.map((m) => [m.userId, m.name])),
  }

  async function saveDetails() {
    setSaving(true)
    try {
      await updateCase(caseData.id, {
        title,
        clientName,
        charges: charges || null,
        priority,
        status,
        notes: notes || null,
      })
      toast.success("Case updated.")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  async function saveAssignment() {
    try {
      await assignCase(caseData.id, {
        attorneyId: attorneyId === UNASSIGNED ? null : attorneyId,
        paralegalId: paralegalId === UNASSIGNED ? null : paralegalId,
      })
      toast.success("Assignment updated.")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign.")
    }
  }

  async function autoSuggest() {
    try {
      const result = await suggestAssignment(caseData.id)
      if (result.counsel) setAttorneyId(result.counsel.userId)
      if (result.paralegal) setParalegalId(result.paralegal.userId)
      toast.success(
        result.counsel
          ? `Suggested ${result.counsel.name} as counsel.`
          : "No available counsel found.",
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to suggest.")
    }
  }

  async function addNewDeadline() {
    if (!newDeadline.trim() || !newDeadlineDate) {
      toast.error("Enter a label and a date.")
      return
    }
    try {
      await addDeadline({
        caseId: caseData.id,
        label: newDeadline.trim(),
        dueDate: new Date(newDeadlineDate),
      })
      setNewDeadline("")
      setNewDeadlineDate("")
      toast.success("Deadline added.")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add deadline.")
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Case Information</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="d-title">Title</FieldLabel>
              <Input
                id="d-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEdit}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="d-client">Client Name</FieldLabel>
              <Input
                id="d-client"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                disabled={!canEdit}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="d-status">Status</FieldLabel>
                <Select
                  items={statusItems}
                  value={status}
                  onValueChange={(v) => setStatus(v ?? status)}
                  disabled={!canEdit}
                >
                  <SelectTrigger id="d-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {CASE_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="d-priority">Priority</FieldLabel>
                <Select
                  items={priorityItems}
                  value={priority}
                  onValueChange={(v) => setPriority(v ?? priority)}
                  disabled={!canEdit}
                >
                  <SelectTrigger id="d-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {CASE_PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="d-charges">Charges</FieldLabel>
              <Textarea
                id="d-charges"
                value={charges}
                onChange={(e) => setCharges(e.target.value)}
                disabled={!canEdit}
                rows={2}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="d-notes">Notes</FieldLabel>
              <Textarea
                id="d-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!canEdit}
                rows={4}
              />
            </Field>
            {canEdit && (
              <Field orientation="horizontal" className="justify-end">
                <Button onClick={saveDetails} disabled={saving}>
                  <Save data-icon="inline-start" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </Field>
            )}
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="size-4 text-primary" />
              Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="d-attorney">Lead Counsel</FieldLabel>
                <Select
                  items={counselItems}
                  value={attorneyId}
                  onValueChange={(v) => setAttorneyId(v ?? UNASSIGNED)}
                  disabled={!canAssign}
                >
                  <SelectTrigger id="d-attorney">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {counsel.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.name} ({m.activeCaseCount})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="d-paralegal">Paralegal</FieldLabel>
                <Select
                  items={paralegalItems}
                  value={paralegalId}
                  onValueChange={(v) => setParalegalId(v ?? UNASSIGNED)}
                  disabled={!canAssign}
                >
                  <SelectTrigger id="d-paralegal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {paralegals.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.name} ({m.activeCaseCount})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              {canAssign && (
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={autoSuggest}>
                    <Wand2 data-icon="inline-start" />
                    Auto-suggest best match
                  </Button>
                  <Button size="sm" onClick={saveAssignment}>
                    <Check data-icon="inline-start" />
                    Save Assignment
                  </Button>
                </div>
              )}
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarPlus className="size-4 text-primary" />
              Filing Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {deadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deadlines yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {deadlines.map((d) => {
                  const id = d.id as string
                  const due = new Date(d.dueDate as string)
                  const completed = d.completed as boolean
                  const overdue = !completed && due.getTime() < Date.now()
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5"
                    >
                      <button
                        onClick={async () => {
                          await toggleDeadline(id, caseData.id, !completed)
                          router.refresh()
                        }}
                        disabled={!canEdit}
                        className="flex min-w-0 items-center gap-2 text-left"
                      >
                        <span
                          className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                            completed
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                              : "border-border"
                          }`}
                        >
                          {completed && <Check className="size-3" />}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={`block truncate text-sm ${
                              completed ? "text-muted-foreground line-through" : ""
                            }`}
                          >
                            {d.label as string}
                          </span>
                          <span
                            className={`block text-xs ${
                              overdue ? "text-red-400" : "text-muted-foreground"
                            }`}
                          >
                            {due.toLocaleDateString()}
                          </span>
                        </span>
                      </button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={async () => {
                            await deleteDeadline(id, caseData.id)
                            router.refresh()
                          }}
                        >
                          <Trash2 className="text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {canEdit && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <Input
                  placeholder="Deadline label (e.g. Motion to suppress)"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={newDeadlineDate}
                    onChange={(e) => setNewDeadlineDate(e.target.value)}
                  />
                  <Button onClick={addNewDeadline}>Add</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
