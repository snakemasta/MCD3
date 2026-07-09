import "server-only"
import { db } from "@/lib/db"
import { auditLogs } from "@/lib/db/schema"

export type AuditCategory =
  | "user"
  | "role"
  | "permission"
  | "case"
  | "evidence"
  | "timeline"
  | "ai"
  | "system"
  | "auth"
  | "template"
  | "intake"

export interface AuditInput {
  actorId?: string | null
  actorName?: string | null
  action: string
  category: AuditCategory
  targetType?: string | null
  targetId?: string | null
  summary: string
  metadata?: Record<string, unknown> | null
}

/**
 * Write an audit log entry. Never throws — auditing must not break the action
 * it is recording.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? null,
      action: input.action,
      category: input.category,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      summary: input.summary,
      metadata: input.metadata ?? null,
    })
  } catch (err) {
    console.log("[v0] audit log failed:", err instanceof Error ? err.message : err)
  }
}
