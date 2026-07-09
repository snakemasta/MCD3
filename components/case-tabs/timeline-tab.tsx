"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, Clock } from "lucide-react"
import type { Role } from "@/lib/constants"
import { can, TIMELINE_EVENT_TYPES, itemsOf, labelOf } from "@/lib/constants"
import {
  addTimelineEvent,
  deleteTimelineEvent,
} from "@/app/actions/timeline"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface TimelineTabProps {
  role: Role
  caseId: string
  timeline: Record<string, unknown>[]
}

export function TimelineTab({ role, caseId, timeline }: TimelineTabProps) {
  const router = useRouter()
  const canManage = can(role, "timeline:manage")
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState("")
  const [title, setTitle] = useState("")
  const [eventType, setEventType] = useState("hearing")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  async function add() {
    if (!title.trim() || !date) {
      toast.error("Title and date are required.")
      return
    }
    setSaving(true)
    try {
      await addTimelineEvent({
        caseId,
        date: new Date(date),
        title: title.trim(),
        eventType,
        description: description.trim() || undefined,
      })
      setTitle("")
      setDate("")
      setDescription("")
      setOpen(false)
      toast.success("Event added.")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add event.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Case Timeline</h2>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus data-icon="inline-start" />
              Add Event
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Timeline Event</DialogTitle>
              </DialogHeader>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="t-title">Title</FieldLabel>
                  <Input
                    id="t-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Arraignment hearing"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="t-date">Date</FieldLabel>
                    <Input
                      id="t-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="t-type">Type</FieldLabel>
                    <Select items={itemsOf(TIMELINE_EVENT_TYPES)} value={eventType} onValueChange={(v) => setEventType(v ?? "hearing")}>
                      <SelectTrigger id="t-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {TIMELINE_EVENT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="t-desc">Description</FieldLabel>
                  <Textarea
                    id="t-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button onClick={add} disabled={saving}>
                  {saving ? "Adding..." : "Add Event"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {timeline.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Clock />
            </EmptyMedia>
            <EmptyTitle>No timeline events</EmptyTitle>
            <EmptyDescription>
              Add key dates, hearings, and filings — or generate a timeline from
              the AI Analysis tab.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="relative flex flex-col gap-0 pl-6">
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />
          {timeline.map((e) => {
            const id = e.id as string
            const d = new Date(e.date as string)
            return (
              <div key={id} className="relative pb-6 last:pb-0">
                <span className="absolute -left-[22px] top-1.5 size-3.5 rounded-full border-2 border-primary bg-background" />
                <Card>
                  <CardContent className="flex items-start justify-between gap-3 pt-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-primary">
                          {d.toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {labelOf(TIMELINE_EVENT_TYPES, e.eventType as string)}
                        </span>
                      </div>
                      <p className="mt-1 font-medium">{e.title as string}</p>
                      {e.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {e.description as string}
                        </p>
                      ) : null}
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={async () => {
                          await deleteTimelineEvent(id, caseId)
                          router.refresh()
                        }}
                      >
                        <Trash2 className="text-muted-foreground" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
