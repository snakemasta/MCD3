"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { submitWarrant } from "@/app/actions/warrants"

export function SubmitWarrantButton({ warrantId }: { warrantId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      try {
        await submitWarrant(warrantId)
        toast.success("Warrant submitted for review")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to submit warrant")
      }
    })
  }

  return (
    <Button onClick={submit} disabled={pending}>
      <Send className="size-4" />
      {pending ? "Submitting…" : "Submit for Review"}
    </Button>
  )
}
