import { listTemplates } from "@/app/actions/admin"
import { PageHeader } from "@/components/page-header"
import { TemplatesManager } from "@/components/admin/templates-manager"

export default async function TemplatesPage() {
  const templates = await listTemplates()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Motion & Draft Templates"
        description="Reusable templates that power AI drafting and document generation."
      />
      <TemplatesManager initialTemplates={templates} />
    </div>
  )
}
