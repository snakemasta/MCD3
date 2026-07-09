"use client"

import { useMemo, useState } from "react"
import type { UIMessage } from "ai"
import { ChatView } from "@/components/chat-view"
import { cn } from "@/lib/utils"
import type { Conversation, Mode } from "@/lib/types"

const ASSISTANT_MODES: { id: Exclude<Mode, "analyzer">; label: string }[] = [
  { id: "attorney", label: "Investigation AI" },
  { id: "general", label: "General Chat" },
]

export function AssistantView() {
  const [mode, setMode] = useState<Exclude<Mode, "analyzer">>("attorney")
  const [store, setStore] = useState<Record<string, UIMessage[]>>({})

  const conversation: Conversation = useMemo(
    () => ({
      id: `assistant-${mode}`,
      mode,
      title: mode === "attorney" ? "Investigation AI" : "General Chat",
      messages: store[`assistant-${mode}`] ?? [],
      createdAt: 0,
    }),
    [mode, store],
  )

  return (
    <div className="flex h-[calc(100svh-0px)] flex-col lg:h-svh">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 sm:px-6">
        {ASSISTANT_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              mode === m.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <ChatView
          conversation={conversation}
          onMessagesChange={(id, messages) =>
            setStore((prev) => ({ ...prev, [id]: messages }))
          }
        />
      </div>
    </div>
  )
}
