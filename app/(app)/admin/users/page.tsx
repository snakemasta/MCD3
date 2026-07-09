import { listUsers } from "@/app/actions/admin"
import { listRoles } from "@/app/actions/admin"
import { requireAdmin } from "@/lib/session"
import { UsersManager } from "@/components/admin/users-manager"

export default async function AdminUsersPage() {
  const current = await requireAdmin()
  const [users, roles] = await Promise.all([listUsers(), listRoles()])

  return (
    <UsersManager
      initialUsers={users}
      roles={roles.map((r) => ({ key: r.key, label: r.label }))}
      currentUserId={current.id}
    />
  )
}
