import { getSettingsForAdmin, listRoles } from "@/app/actions/admin"
import { WarrantSettingsForm } from "@/components/admin/warrant-settings-form"

export default async function WarrantSettingsPage() {
  const [settings, roles] = await Promise.all([
    getSettingsForAdmin("warrant"),
    listRoles(),
  ])

  const roleOptions = roles.map((r) => ({ key: r.key, label: r.label }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Warrant Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Configure the warrant workflow: which roles submit, review, approve, and close warrants; custom
          warrant types; AI scoring thresholds; and automation for case creation and notifications.
        </p>
      </div>

      <WarrantSettingsForm settings={settings} roleOptions={roleOptions} />
    </div>
  )
}
