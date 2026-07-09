import { getSettingsForAdmin, listAllOptions } from "@/app/actions/admin"
import { PageHeader } from "@/components/page-header"
import { SystemSettingsForm } from "@/components/admin/system-settings-form"

export const metadata = { title: "System Settings · Admin" }

export default async function SystemSettingsPage() {
  const [settings, options] = await Promise.all([
    getSettingsForAdmin("system"),
    listAllOptions(),
  ])

  const pick = (category: string) =>
    options
      .filter((o) => o.category === category && o.active)
      .map((o) => ({ value: o.value, label: o.label }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="System Settings"
        description="General application configuration and operational controls."
      />
      <SystemSettingsForm
        settings={settings}
        statuses={pick("case_status")}
        priorities={pick("case_priority")}
      />
    </div>
  )
}
