import { getSettingsForAdmin } from "@/app/actions/admin"
import { PageHeader } from "@/components/page-header"
import { SecuritySettingsForm } from "@/components/admin/security-settings-form"

export const metadata = { title: "Security Settings · Admin" }

export default async function SecuritySettingsPage() {
  const settings = await getSettingsForAdmin("security")

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Security & Access"
        description="Control authentication, visibility, and account access rules."
      />
      <SecuritySettingsForm settings={settings} />
    </div>
  )
}
