"use server"

import { requireAdmin } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import {
  runPermissionAudit as runAudit,
  type PermissionAuditResult,
} from "@/lib/permission-audit"

/**
 * Admin-only: run the full permission/role/route audit and return structured
 * results. The run itself is recorded in the audit log.
 */
export async function runPermissionAudit(): Promise<PermissionAuditResult> {
  const admin = await requireAdmin()
  const result = await runAudit()

  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "system.permission_audit",
    category: "system",
    targetType: "system",
    targetId: "permissions",
    summary: `Ran permission audit (${result.summary.fail} failing, ${result.summary.warn} warnings)`,
    metadata: { summary: result.summary },
  })

  return result
}
