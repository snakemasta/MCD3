"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Sparkles, UserCheck } from "lucide-react"
import { createCase } from "@/app/actions/cases"
import { CASE_TYPES, CASE_PRIORITIES, ROLE_LABELS, itemsOf, type Role } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

export function NewCaseForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [title, setTitle] = useState("")
  const [clientName, setClientName] = useState("")
  const [charges, setCharges] = useState("")
  const [caseType, setCaseType] = useState("criminal")
  const [priority, setPriority] = useState("normal")
  const [notes, setNotes] = useState("")
  const [conflictFlag, setConflictFlag] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !clientName.trim()) {
      toast.error("Case title and client name are required.")
      return
    }
    setPending(true)
    try {
      const { id, assignment } = await createCase({
        title: title.trim(),
        clientName: clientName.trim(),
        charges: charges.trim() || undefined,
        caseType,
        priority,
        notes: notes.trim() || undefined,
        conflictFlag,
      })
      const counsel = assignment.counsel
      if (counsel) {
        toast.success(
          `Case created. Auto-assigned to ${counsel.name} (${ROLE_LABELS[counsel.role as Role]}).`,
        )
      } else {
        toast.success("Case created. No available counsel — assign manually.")
      }
      router.push(`/cases/${id}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create case.")
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Case Details</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">Case Title</FieldLabel>
              <Input
                id="title"
                placeholder="State v. Johnson"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="client">Client Name</FieldLabel>
              <Input
                id="client"
                placeholder="Marcus Johnson"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="type">Case Type</FieldLabel>
                <Select items={itemsOf(CASE_TYPES)} value={caseType} onValueChange={(v) => setCaseType(v ?? "criminal")}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {CASE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="priority">Priority</FieldLabel>
                <Select items={itemsOf(CASE_PRIORITIES)} value={priority} onValueChange={(v) => setPriority(v ?? "normal")}>
                  <SelectTrigger id="priority">
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
              <FieldLabel htmlFor="charges">Charges</FieldLabel>
              <Textarea
                id="charges"
                placeholder="e.g. Possession of a controlled substance (Penal Code 11350)"
                value={charges}
                onChange={(e) => setCharges(e.target.value)}
                rows={2}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="notes">Intake Notes</FieldLabel>
              <Textarea
                id="notes"
                placeholder="Initial notes about the case..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </Field>
            <Field orientation="horizontal">
              <Switch
                id="conflict"
                checked={conflictFlag}
                onCheckedChange={setConflictFlag}
              />
              <div className="flex flex-col gap-0.5">
                <FieldLabel htmlFor="conflict">Conflict of interest flag</FieldLabel>
                <FieldDescription>
                  Affects auto-assignment routing for sensitive cases.
                </FieldDescription>
              </div>
            </Field>

            <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-muted-foreground">
                On creation, this case is automatically routed to the best
                available counsel and paralegal based on caseload, availability,
                specialty match, and priority.
              </p>
            </div>

            <Field orientation="horizontal" className="justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserCheck data-icon="inline-start" />
                    Create &amp; Auto-Assign
                  </>
                )}
              </Button>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  )
}
