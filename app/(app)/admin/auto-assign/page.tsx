import { getSettingsForAdmin, listRoles } from "@/app/actions/admin"
import { AutoAssignForm } from "@/components/admin/auto-assign-form"

export default async function AutoAssignPage() {
  const [settings, roles] = await Promise.all([
    getSettingsForAdmin("auto_assign"),
    listRoles(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Auto-Assignment Rules
        </h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Control how new cases are automatically routed to counsel and support
          staff. These rules drive the assignment engine when a case is created.
        </p>
      </div>

      <AutoAssignForm
        settings={settings}
        roles={roles.map((r) => ({
          key: r.key,
          label: r.label,
          isCounsel: r.isCounsel,
        }))}
      />
    </div>
  )
}
