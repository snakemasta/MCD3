import { requireJudge } from "@/lib/session"
import { APP_INTERFACES } from "@/lib/constants"
import { getNotificationPreferences } from "@/lib/notification-preferences"
import { AppShell } from "@/components/app-shell"

export default async function JudgeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireJudge()
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
      surface="judge"
      interfaces={interfaces}
      appName="Judicial Review"
      notificationPreferences={notificationPreferences}
    >
      {children}
    </AppShell>
  )
}
