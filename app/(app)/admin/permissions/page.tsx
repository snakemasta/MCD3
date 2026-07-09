import { Check, Minus, ShieldCheck } from "lucide-react"
import { getPermissionMatrix } from "@/lib/permission-audit"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PermissionAuditPanel } from "@/components/admin/permission-audit-panel"

export const metadata = {
  title: "Permissions Health Check",
}

export default async function PermissionsHealthPage() {
  const { roles, permissions, interfaces } = await getPermissionMatrix()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ShieldCheck className="size-5 text-primary" />
          Permissions Health Check
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review every role&apos;s permissions and interface access, then run an
          automated audit of roles, admin access, interfaces, and server-side
          enforcement.
        </p>
      </div>

      <PermissionAuditPanel />

      {/* Role → interface access ------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>Interface Access by Role</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 font-medium">Role</th>
                {interfaces.map((i) => (
                  <th key={i.id} className="px-3 py-2 text-center font-medium">
                    {i.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.key} className="border-b border-border/60">
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-2">
                      {role.label}
                      {role.adminAccess && (
                        <Badge variant="secondary" className="gap-1 font-normal">
                          <ShieldCheck className="size-3" /> All
                        </Badge>
                      )}
                    </span>
                  </td>
                  {interfaces.map((i) => {
                    const has = role.interfaces.includes(i.id)
                    return (
                      <td key={i.id} className="px-3 py-2 text-center">
                        {has ? (
                          <Check className="mx-auto size-4 text-primary" aria-label="Has access" />
                        ) : (
                          <Minus className="mx-auto size-4 text-muted-foreground/40" aria-label="No access" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Role → permission matrix ----------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions Matrix</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="sticky left-0 bg-card py-2 pr-4 font-medium">
                  Permission
                </th>
                {roles.map((role) => (
                  <th
                    key={role.key}
                    className="px-2 py-2 text-center align-bottom font-medium"
                  >
                    <span className="block whitespace-nowrap text-xs">
                      {role.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((perm) => (
                <tr key={perm.key} className="border-b border-border/60">
                  <td className="sticky left-0 bg-card py-2 pr-4">
                    {perm.label}
                  </td>
                  {roles.map((role) => {
                    const has =
                      role.adminAccess || role.permissions.includes(perm.key)
                    return (
                      <td key={role.key} className="px-2 py-2 text-center">
                        {has ? (
                          <Check className="mx-auto size-4 text-primary" aria-label="Granted" />
                        ) : (
                          <Minus
                            className="mx-auto size-4 text-muted-foreground/40"
                            aria-label="Not granted"
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
