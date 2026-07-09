import { getSettingsForAdmin, listRoles } from "@/app/actions/admin"
import { PageHeader } from "@/components/page-header"
import { AiSettingsForm } from "@/components/admin/ai-settings-form"

export default async function AiSettingsPage() {
  const [settings, roles] = await Promise.all([
    getSettingsForAdmin("ai"),
    listRoles(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI Settings"
        description="Configure the AI model, attorney persona, analysis rules, and which roles can use AI features."
      />
      <AiSettingsForm
        settings={settings}
        roles={roles.map((r) => ({ key: r.key, label: r.label }))}
      />
    </div>
  )
}
