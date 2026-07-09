"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { addIntakeNote } from "@/app/actions/intake"
import { toast } from "sonner"

interface Note {
  id: string
  authorName: string
  body: string
  createdAt: Date
}

export function IntakeNotesPanel({
  intakeId,
  notes,
}: {
  intakeId: string
  notes: Note[]
}) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [pending, startTransition] = useTransition()

  function add() {
    if (!body.trim()) return
    startTransition(async () => {
      try {
        await addIntakeNote(intakeId, body)
        setBody("")
        toast.success("Note added")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to add note")
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add an internal note (not visible to the client)..."
          rows={3}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={add} disabled={pending || !body.trim()} nativeButton>
            {pending && <Loader2 className="size-4 animate-spin" data-icon />}
            Add Note
          </Button>
        </div>
      </div>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No internal notes yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{n.authorName}</span>
                <time dateTime={new Date(n.createdAt).toISOString()}>
                  {new Date(n.createdAt).toLocaleString()}
                </time>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
