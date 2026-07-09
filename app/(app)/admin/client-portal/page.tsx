import { getSettingsForAdmin } from "@/app/actions/admin"
import { ClientPortalSettingsForm } from "@/components/admin/client-portal-settings-form"

export default async function ClientPortalSettingsPage() {
  const settings = await getSettingsForAdmin("civilian")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Informant Portal & Intake</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
          Control who can register, which intake forms clients see, how requests are
          reviewed, and what clients can access once their case is opened.
        </p>
      </div>

      <ClientPortalSettingsForm settings={settings} />
    </div>
  )
}
