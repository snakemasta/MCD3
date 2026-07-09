"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { respondToInfoRequest } from "@/app/actions/warrants"

export function InfoResponseForm({
  warrantId,
  question,
}: {
  warrantId: string
  question: string
}) {
  const router = useRouter()
  const [response, setResponse] = useState("")
  const [pending, startTransition] = useTransition()

  function submit() {
    if (!response.trim()) {
      toast.error("Enter a response before resubmitting")
      return
    }
    startTransition(async () => {
      try {
        await respondToInfoRequest(warrantId, response)
        toast.success("Response submitted — warrant returned for review")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to submit response")
      }
    })
  }

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
      <h2 className="text-sm font-semibold text-orange-900">The judge requested more information</h2>
      <p className="mt-1 rounded-lg bg-card p-3 text-sm text-foreground">{question}</p>
      <Textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Provide the requested information…"
        className="mt-3 min-h-24 bg-card"
      />
      <Button onClick={submit} disabled={pending} size="sm" className="mt-3">
        <Send className="size-4" />
        {pending ? "Submitting…" : "Submit Response"}
      </Button>
    </div>
  )
}
