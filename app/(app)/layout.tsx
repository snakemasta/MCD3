import type React from "react"
import { requireStaff } from "@/lib/session"
import { getOptionsConfig } from "@/lib/options"
import { getSettings } from "@/lib/settings"
import { openIntakeCount } from "@/lib/intake"
import { hasPerm, APP_INTERFACES } from "@/lib/constants"
import { getNotificationPreferences } from "@/lib/notification-preferences"
import { AppShell } from "@/components/app-shell"
import { OptionsProvider } from "@/components/options-provider"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireStaff()
  const canReviewIntake = hasPerm(user.permissions, "intake:review")
  const [options, system, intakeOpenCount, notificationPreferences] = await Promise.all([
    getOptionsConfig(),
    getSettings("system"),
    canReviewIntake ? openIntakeCount() : Promise.resolve(0),
    getNotificationPreferences(user.id, user.role),
  ])

  const interfaces = APP_INTERFACES.filter((i) => user.interfaces.includes(i.id))

  return (
    <OptionsProvider config={options}>
      <AppShell
        user={{
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          adminAccess: user.adminAccess,
        }}
        surface="app"
        interfaces={interfaces}
        appName={system.appName}
        intakeOpenCount={intakeOpenCount}
        notificationPreferences={notificationPreferences}
      >
        {children}
      </AppShell>
    </OptionsProvider>
  )
}
