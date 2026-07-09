"use client"

import Link from "next/link"
import { Gavel, Plus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MotionStatusBadge } from "@/components/motions/motion-status-badge"
import { motionTypeLabel, motionSideLabel } from "@/lib/motion-utils"

export interface CaseMotionItem {
  id: string
  motionNumber: string
  title: string
  motionType: string
  filingSide: string
  filedByName: string | null
  status: string
  createdAt: string
  decidedAt: string | null
}

export function MotionsTab({
  motions,
  basePath,
  newHref,
  canFile,
  typeOptions = [],
  statusLabels = {},
}: {
  motions: CaseMotionItem[]
  /** Detail link base, e.g. "/motions" or "/prosecution/motion". */
  basePath: string
  /** Link for filing a new motion pre-scoped to this case. */
  newHref: string
  canFile: boolean
  typeOptions?: { value: string; label: string }[]
  statusLabels?: Record<string, string>
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Motions</h2>
        {canFile && (
          <Button nativeButton={false} render={<Link href={newHref} />} size="sm">
            <Plus data-icon="inline-start" />
            File Motion
          </Button>
        )}
      </div>

      {motions.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <Gavel className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No motions have been filed on this case yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {motions.map((m) => (
            <Card key={m.id} className="p-0 transition-colors hover:bg-muted/50">
              <Link href={`${basePath}/${m.id}`} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{m.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {m.motionNumber} · {motionTypeLabel(m.motionType, typeOptions)} ·{" "}
                    {motionSideLabel(m.filingSide)}
                    {m.filedByName ? ` · ${m.filedByName}` : ""}
                  </p>
                </div>
                <MotionStatusBadge status={m.status} labels={statusLabels} />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
