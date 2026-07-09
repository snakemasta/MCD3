import { listAuditLogs } from "@/app/actions/admin"
import { PageHeader } from "@/components/page-header"
import { AuditLogsViewer } from "@/components/admin/audit-logs-viewer"

export const metadata = { title: "Audit Logs · Admin" }

export default async function AuditLogsPage() {
  const logs = await listAuditLogs({ limit: 200 })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit Logs"
        description="A record of sensitive actions taken across the system."
      />
      <AuditLogsViewer initial={logs} />
    </div>
  )
}
