"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Send, ArrowDown } from "lucide-react"
import { sendCivilianMessage } from "@/app/actions/portal"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export interface ThreadMessage {
  id: string
  senderId: string
  senderRole: string
  senderName: string
  body: string
  createdAt: Date
  /** Optional precomputed ownership; falls back to currentUserId comparison. */
  mine?: boolean
}

function formatTime(d: Date) {
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function MessageThread({
  messages,
  intakeId,
  caseId,
  currentUserId,
  disabled,
  disabledHint,
  canSend,
  onSendAction,
  emptyText,
}: {
  messages: ThreadMessage[]
  intakeId?: string
  caseId?: string
  currentUserId?: string
  disabled?: boolean
  disabledHint?: string
  /** When true, render the composer even without the default civilian action. */
  canSend?: boolean
  /** Custom send handler (e.g. staff reply). Defaults to civilian messaging. */
  onSendAction?: (body: string) => Promise<void>
  emptyText?: string
}) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [pending, start] = useTransition()

  // Scroll-aware live behavior: keep the user pinned to the latest message
  // only when they're already near the bottom; otherwise surface a "new
  // messages" indicator so background updates never yank their scroll position.
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const prevCountRef = useRef(messages.length)
  const justSentRef = useRef(false)
  const [hasNew, setHasNew] = useState(false)

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
    setHasNew(false)
  }

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    atBottomRef.current = distance < 64
    if (atBottomRef.current) setHasNew(false)
  }

  // React to message list changes (new sends or background poll updates).
  useEffect(() => {
    const grew = messages.length > prevCountRef.current
    prevCountRef.current = messages.length
    if (justSentRef.current) {
      justSentRef.current = false
      scrollToBottom()
      return
    }
    if (!grew) return
    if (atBottomRef.current) {
      scrollToBottom()
    } else {
      setHasNew(true)
    }
  }, [messages.length])

  // Pin to bottom on first render.
  useEffect(() => {
    scrollToBottom("auto")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function send() {
    const text = body.trim()
    if (!text) return
    start(async () => {
      try {
        if (onSendAction) {
          await onSendAction(text)
        } else {
          const res = await sendCivilianMessage({ intakeId, caseId, body: text })
          if (!res.ok) {
            toast.error(res.error ?? "Could not send message")
            return
          }
        }
        setBody("")
        justSentRef.current = true
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not send message")
      }
    })
  }

  const showComposer = !disabled && (canSend || !onSendAction)

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto pr-1"
        >
        {messages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyText ?? "No messages yet. Send a message to your legal team below."}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.mine ?? (currentUserId ? m.senderId === currentUserId : false)
            return (
              <div
                key={m.id}
                className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                    mine
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                </div>
                <p className="px-1 text-xs text-muted-foreground">
                  {mine ? "You" : m.senderName} · {formatTime(m.createdAt)}
                </p>
              </div>
            )
          })
        )}
        </div>
        {hasNew ? (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className="absolute bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-md transition-transform hover:scale-105"
          >
            <ArrowDown className="size-3.5" />
            New messages
          </button>
        ) : null}
      </div>

      {disabled ? (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
          {disabledHint ?? "Messaging is not available here."}
        </p>
      ) : showComposer ? (
        <div className="flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message..."
            rows={2}
            className="flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                send()
              }
            }}
          />
          <Button onClick={send} disabled={pending || !body.trim()} size="icon" aria-label="Send message">
            <Send />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
