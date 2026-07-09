import { getSettingsForAdmin, listRoles } from "@/app/actions/admin"
import { NotificationSettingsForm } from "@/components/admin/notification-settings-form"

export default async function NotificationSettingsPage() {
  const [settings, roles] = await Promise.all([
    getSettingsForAdmin("notification"),
    listRoles(),
  ])

  const roleOptions = roles.map((r) => ({ key: r.key, label: r.label }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Notification Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Control platform-wide notification sounds: the master on/off switch, the default sound and
          volume for new users, and which roles are allowed to hear audible alerts. Individual users
          tune their own preferences from their Settings page.
        </p>
      </div>

      <NotificationSettingsForm settings={settings} roleOptions={roleOptions} />
    </div>
  )
}
