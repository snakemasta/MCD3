import type React from "react"
import { requireCivilian } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { APP_INTERFACES } from "@/lib/constants"
import { PortalShell } from "@/components/portal/portal-shell"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireCivilian()
  const system = await getSettings("system")
  const interfaces = APP_INTERFACES.filter((i) => user.interfaces.includes(i.id))

  return (
    <PortalShell
      user={{ name: user.name, email: user.email }}
      firmName={system.firmName}
      interfaces={interfaces}
      adminAccess={user.adminAccess}
    >
      {children}
    </PortalShell>
  )
}
