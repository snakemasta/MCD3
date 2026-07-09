import { getSettingsForAdmin } from "@/app/actions/admin"
import { DASHBOARD_CARDS } from "@/lib/settings"
import { PageHeader } from "@/components/page-header"
import { DashboardSettingsForm } from "@/components/admin/dashboard-settings-form"

export default async function DashboardSettingsPage() {
  const settings = await getSettingsForAdmin("dashboard")
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard Settings"
        description="Choose which summary cards and panels appear on the team dashboard."
      />
      <DashboardSettingsForm settings={settings} cards={DASHBOARD_CARDS} />
    </div>
  )
}
