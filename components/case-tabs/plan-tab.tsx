"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, ListChecks, Sparkles, Check } from "lucide-react"
import type { Role } from "@/lib/constants"
import { can, PLAN_CATEGORIES, itemsOf, labelOf } from "@/lib/constants"
import {
  addPlanItem,
  addPlanItems,
  updatePlanItem,
  deletePlanItem,
} from "@/app/actions/plan"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { PlanStatusBadge } from "@/components/case-badges"
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
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface PlanTabProps {
  role: Role
  caseId: string
  plan: Record<string, unknown>[]
}

const NEXT_STATUS: Record<string, string> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
}

export function PlanTab({ role, caseId, plan }: PlanTabProps) {
  const router = useRouter()
  const canManage = can(role, "plan:manage")
  const canUseAI = can(role, "ai:use")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("next_step")
  const [generating, setGenerating] = useState(false)

  async function add() {
    if (!content.trim()) {
      toast.error("Enter a task.")
      return
    }
    try {
      await addPlanItem({ caseId, content: content.trim(), category })
      setContent("")
      toast.success("Task added.")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add task.")
    }
  }

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Generation failed")
      }
      const data = (await res.json()) as {
        items: { content: string; category: string }[]
      }
      await addPlanItems(caseId, data.items)
      toast.success(`Added ${data.items.length} AI-suggested tasks.`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed.")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Case Plan</h2>
        {canUseAI && (
          <Button variant="outline" size="sm" onClick={generate} disabled={generating}>
            {generating ? <Spinner data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}
            {generating ? "Generating..." : "AI Generate Plan"}
          </Button>
        )}
      </div>

      {canManage && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Add a task (e.g. File motion to suppress)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <div className="flex gap-2">
            <Select items={itemsOf(PLAN_CATEGORIES)} value={category} onValueChange={(v) => setCategory(v ?? "next_step")}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {PLAN_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button onClick={add}>
              <Plus data-icon="inline-start" />
              Add
            </Button>
          </div>
        </div>
      )}

      {plan.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecks />
            </EmptyMedia>
            <EmptyTitle>No plan items</EmptyTitle>
            <EmptyDescription>
              Build a defense plan manually or let the AI suggest next steps.
            </EmptyDescription>
          </EmptyHeader>
          {canUseAI && (
            <EmptyContent>
              <Button onClick={generate} disabled={generating}>
                {generating ? <Spinner data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}
                Generate with AI
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {plan.map((p) => {
            const id = p.id as string
            const status = p.status as string
            return (
              <Card key={id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <button
                    onClick={async () => {
                      if (!canManage) return
                      await updatePlanItem(id, caseId, { status: NEXT_STATUS[status] })
                      router.refresh()
                    }}
                    disabled={!canManage}
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                      status === "done"
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                        : "border-border"
                    }`}
                    aria-label="Toggle status"
                  >
                    {status === "done" && <Check className="size-3" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${
                        status === "done" ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {p.content as string}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {labelOf(PLAN_CATEGORIES, p.category as string)}
                    </span>
                  </div>
                  <PlanStatusBadge status={status} />
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={async () => {
                        await deletePlanItem(id, caseId)
                        router.refresh()
                      }}
                    >
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
