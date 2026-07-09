"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { useEffect, useRef, useState } from "react"
import { ArrowUp, Scale, Square, Gavel, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { Markdown } from "@/components/markdown"
import { MODES, type Conversation, type Mode } from "@/lib/types"

const SUGGESTIONS: Record<Exclude<Mode, "analyzer">, string[]> = {
  general: [
    "Explain how a bill becomes a law",
    "Summarize the steps of a civil lawsuit",
    "What is the difference between a felony and a misdemeanor?",
  ],
  attorney: [
    "Draft a motion to suppress evidence from an unlawful search",
    "Review whether probable cause exists for a traffic stop arrest",
    "Explain the elements of a burglary charge and key defenses",
  ],
}

function messageText(message: UIMessage): string {
  return (message.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

interface ChatViewProps {
  conversation: Conversation
  onMessagesChange: (id: string, messages: UIMessage[]) => void
}

export function ChatView({ conversation, onMessagesChange }: ChatViewProps) {
  const mode = conversation.mode as Exclude<Mode, "analyzer">
  const meta = MODES.find((m) => m.id === conversation.mode)!
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { messages, sendMessage, status, stop, error } = useChat({
    id: conversation.id,
    messages: conversation.messages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { messages, mode: conversation.mode },
      }),
    }),
  })

  const busy = status === "submitted" || status === "streaming"

  useEffect(() => {
    onMessagesChange(conversation.id, messages)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, status])

  function submit(text: string) {
    const value = text.trim()
    if (!value || busy) return
    sendMessage({ text: value })
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  const Icon = conversation.mode === "attorney" ? Gavel : MessageSquare

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center pt-10 text-center sm:pt-20">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Icon className="size-7" />
              </div>
              <h2 className="mt-5 text-balance text-2xl font-semibold">
                {meta.title}
              </h2>
              <p className="mt-2 max-w-md text-pretty text-sm text-muted-foreground">
                {meta.description}
              </p>
              <div className="mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-1">
                {SUGGESTIONS[mode].map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-card-foreground transition-colors hover:border-primary/50 hover:bg-accent/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((m) => (
                <Message key={m.id} role={m.role} text={messageText(m)} />
              ))}
              {status === "submitted" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="size-2 animate-pulse rounded-full bg-primary" />
                  Thinking...
                </div>
              )}
              {error && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Something went wrong generating a response. Please try again.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-background/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2 focus-within:border-primary/60">
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              placeholder={`Message ${meta.title}...`}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = "auto"
                e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  submit(input)
                }
              }}
              className="max-h-48 flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={() => (busy ? stop() : submit(input))}
              disabled={!busy && !input.trim()}
              aria-label={busy ? "Stop" : "Send message"}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                busy
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40",
              )}
            >
              {busy ? (
                <Square className="size-4 fill-current" />
              ) : (
                <ArrowUp className="size-5" />
              )}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            MCD CaseOps Platform can make mistakes. Verify important legal
            information.
          </p>
        </div>
      </div>
    </div>
  )
}

function Message({ role, text }: { role: string; text: string }) {
  const isUser = role === "user"
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        <Scale className="size-4" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5 text-sm text-foreground">
        <Markdown content={text} />
      </div>
    </div>
  )
}
