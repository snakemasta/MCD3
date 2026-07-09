import { requireLawEnforcement } from "@/lib/session"
import { APP_INTERFACES } from "@/lib/constants"
import { getNotificationPreferences } from "@/lib/notification-preferences"
import { AppShell } from "@/components/app-shell"

export default async function LELayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireLawEnforcement()
  const interfaces = APP_INTERFACES.filter((i) => user.interfaces.includes(i.id))
  const notificationPreferences = await getNotificationPreferences(user.id, user.role)

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        adminAccess: user.adminAccess,
      }}
      surface="le"
      interfaces={interfaces}
      appName="Law Enforcement Portal"
      notificationPreferences={notificationPreferences}
    >
      {children}
    </AppShell>
  )
}
