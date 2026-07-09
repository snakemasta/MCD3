"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { Send, Sparkles, MessageSquare } from "lucide-react"
import type { CaseMessageRow } from "@/app/actions/case-chat"
import { postCaseMessage } from "@/app/actions/case-chat"
import { Button } from "@/components/ui/button"
import { Markdown } from "@/components/markdown"
import { Spinner } from "@/components/ui/spinner"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"

interface ChatTabProps {
  caseId: string
  initialMessages: CaseMessageRow[]
}

function textOf(msg: UIMessage): string {
  return (msg.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

export function CaseChatTab({ caseId, initialMessages }: ChatTabProps) {
  const seeded = useMemo<UIMessage[]>(
    () =>
      initialMessages.map((m) => ({
        id: m.id,
        role: m.authorId ? "user" : "assistant",
        parts: [{ type: "text", text: m.body }],
      })),
    [initialMessages],
  )

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/case-chat",
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { messages, caseId },
      }),
    }),
    messages: seeded,
  })

  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const busy = status === "streaming" || status === "submitted"

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  function submit() {
    const text = input.trim()
    if (!text || busy) return
    sendMessage({ text })
    // Persist the user's note to the case thread (fire and forget).
    void postCaseMessage({ caseId, body: text })
    setInput("")
  }

  return (
    <div className="flex h-[calc(100dvh-16rem)] min-h-96 flex-col rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="size-4 text-primary" />
        <div>
          <p className="text-sm font-medium">Case Assistant</p>
          <p className="text-xs text-muted-foreground">
            Ask about this case — the AI has full case context.
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <MessageSquare className="size-8" />
            <p className="text-sm">
              No messages yet. Ask the assistant about strategy, evidence, or
              next steps.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m) => {
              const isUser = m.role === "user"
              return (
                <div
                  key={m.id}
                  className={isUser ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      isUser
                        ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                        : "max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-2.5 text-sm"
                    }
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{textOf(m)}</p>
                    ) : (
                      <Markdown content={textOf(m)} />
                    )}
                  </div>
                </div>
              )
            })}
            {status === "submitted" && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                  <Spinner />
                  Thinking...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <InputGroup>
          <InputGroupTextarea
            placeholder="Ask about this case..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
          />
          <InputGroupAddon align="block-end">
            <InputGroupButton
              className="ml-auto"
              variant="default"
              disabled={busy || !input.trim()}
              onClick={submit}
            >
              <Send data-icon="inline-start" />
              Send
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  )
}
