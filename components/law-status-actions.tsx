"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Archive, RotateCcw } from "lucide-react"

interface LawStatusActionsProps {
  lawId: string
  status: string
  canApprove: boolean
  canArchive: boolean
}

export function LawStatusActions({ lawId, status, canApprove, canArchive }: LawStatusActionsProps) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  async function changeStatus(next: "active" | "draft" | "archived") {
    setPending(next)
    try {
      const res = await fetch(`/api/laws/${lawId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Action failed.")
      router.refresh()
    } catch (err) {
      console.error("[v0] Law status action error:", err)
      alert(err instanceof Error ? err.message : "Action failed.")
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      {canApprove && status === "draft" && (
        <Button onClick={() => changeStatus("active")} disabled={pending !== null}>
          <CheckCircle2 className="size-4" />
          {pending === "active" ? "Publishing..." : "Approve & Publish"}
        </Button>
      )}
      {canArchive && status !== "archived" && (
        <Button variant="outline" onClick={() => changeStatus("archived")} disabled={pending !== null}>
          <Archive className="size-4" />
          {pending === "archived" ? "Archiving..." : "Archive"}
        </Button>
      )}
      {canArchive && status === "archived" && (
        <Button variant="outline" onClick={() => changeStatus("active")} disabled={pending !== null}>
          <RotateCcw className="size-4" />
          {pending === "active" ? "Restoring..." : "Restore"}
        </Button>
      )}
    </>
  )
}
