import { listRoles } from "@/app/actions/admin"
import { RolesManager } from "@/components/admin/roles-manager"

export default async function AdminRolesPage() {
  const roles = await listRoles()
  return <RolesManager initialRoles={roles} />
}
