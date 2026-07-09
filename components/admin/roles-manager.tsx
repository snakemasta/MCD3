"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, Lock, ShieldCheck, Gavel } from "lucide-react"
import {
  createRole,
  updateRole,
  deleteRole,
} from "@/app/actions/admin"
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  type Permission,
} from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"

interface RoleRow {
  id: string
  key: string
  label: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  isCounsel: boolean
  adminAccess: boolean
}

export function RolesManager({ initialRoles }: { initialRoles: RoleRow[] }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<RoleRow | null>(null)
  const [deleting, setDeleting] = useState<RoleRow | null>(null)
  const [pending, startTransition] = useTransition()

  function confirmDelete() {
    if (!deleting) return
    startTransition(async () => {
      try {
        await deleteRole(deleting.id)
        toast.success(`Deleted "${deleting.label}"`)
        setDeleting(null)
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete role")
      }
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {initialRoles.length} roles. Toggle permissions to control what each role can do across the app.
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus data-icon="inline-start" />
          New Role
        </Button>
      </div>

      <div className="grid gap-4">
        {initialRoles.map((role) => (
          <Card key={role.id}>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div className="min-w-0">
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {role.label}
                  {role.isSystem && (
                    <Badge variant="outline" className="gap-1 font-normal">
                      <Lock className="size-3" /> Built-in
                    </Badge>
                  )}
                  {role.adminAccess && (
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <ShieldCheck className="size-3" /> Admin
                    </Badge>
                  )}
                  {role.isCounsel && (
                    <Badge variant="outline" className="gap-1 font-normal">
                      <Gavel className="size-3" /> Counsel
                    </Badge>
                  )}
                </CardTitle>
                {role.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {role.description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(role)}>
                  Edit
                </Button>
                {!role.isSystem && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleting(role)}
                    aria-label={`Delete ${role.label}`}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    No permissions granted
                  </span>
                ) : (
                  role.permissions.map((p) => (
                    <Badge key={p} variant="secondary" className="font-normal">
                      {PERMISSION_LABELS[p as Permission] ?? p}
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <RoleDialog
        mode="create"
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false)
          router.refresh()
        }}
      />
      <RoleDialog
        mode="edit"
        role={editing ?? undefined}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          router.refresh()
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this role?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the &quot;{deleting?.label}&quot; role. Members must be reassigned first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={pending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function RoleDialog({
  mode,
  role,
  open,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit"
  role?: RoleRow
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [label, setLabel] = useState("")
  const [description, setDescription] = useState("")
  const [permissions, setPermissions] = useState<string[]>([])
  const [isCounsel, setIsCounsel] = useState(false)
  const [adminAccess, setAdminAccess] = useState(false)
  const [initialized, setInitialized] = useState<string | null>(null)

  const syncKey = mode === "edit" ? role?.id ?? null : open ? "create" : null
  if (open && initialized !== syncKey) {
    setLabel(role?.label ?? "")
    setDescription(role?.description ?? "")
    setPermissions(role?.permissions ?? [])
    setIsCounsel(role?.isCounsel ?? false)
    setAdminAccess(role?.adminAccess ?? false)
    setInitialized(syncKey)
  }
  if (!open && initialized !== null) {
    setInitialized(null)
  }

  function togglePerm(p: string) {
    setPermissions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    )
  }

  function toggleGroup(groupPerms: Permission[], on: boolean) {
    setPermissions((prev) => {
      const set = new Set(prev)
      groupPerms.forEach((p) => (on ? set.add(p) : set.delete(p)))
      return Array.from(set)
    })
  }

  function save() {
    startTransition(async () => {
      try {
        if (mode === "create") {
          await createRole({
            label,
            description,
            permissions,
            isCounsel,
            adminAccess,
          })
          toast.success("Role created")
        } else if (role) {
          await updateRole({
            id: role.id,
            label,
            description,
            permissions,
            isCounsel,
            adminAccess,
          })
          toast.success("Role updated")
        }
        onSaved()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save role")
      }
    })
  }

  const lockName = mode === "edit" && role?.isSystem

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create role" : `Edit ${role?.label}`}</DialogTitle>
          <DialogDescription>
            Define the role and exactly what it can do. Permissions are enforced across the entire app.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto">
          <Field>
            <FieldLabel htmlFor="role-label">Role name</FieldLabel>
            <Input
              id="role-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Senior Paralegal"
              disabled={lockName}
            />
            {lockName && (
              <FieldDescription>
                Built-in role names cannot be changed, but you can adjust their permissions.
              </FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="role-desc">Description</FieldLabel>
            <Textarea
              id="role-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this role responsible for?"
              rows={2}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field orientation="horizontal" className="rounded-lg border border-border p-3">
              <div className="flex flex-col gap-0.5">
                <FieldLabel htmlFor="role-counsel">Lead counsel</FieldLabel>
                <FieldDescription>Assignable as case counsel.</FieldDescription>
              </div>
              <Switch id="role-counsel" checked={isCounsel} onCheckedChange={setIsCounsel} />
            </Field>
            <Field orientation="horizontal" className="rounded-lg border border-border p-3">
              <div className="flex flex-col gap-0.5">
                <FieldLabel htmlFor="role-admin">Admin access</FieldLabel>
                <FieldDescription>Can open this admin panel.</FieldDescription>
              </div>
              <Switch id="role-admin" checked={adminAccess} onCheckedChange={setAdminAccess} />
            </Field>
          </div>

          <Separator />

          <div className="flex flex-col gap-4">
            {PERMISSION_GROUPS.map((group) => {
              const allOn = group.permissions.every((p) => permissions.includes(p))
              return (
                <div key={group.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{group.label}</p>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.permissions as Permission[], !allOn)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {allOn ? "Clear all" : "Select all"}
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.permissions.map((p) => (
                      <label
                        key={p}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border p-2.5 text-sm hover:bg-muted"
                      >
                        <Checkbox
                          checked={permissions.includes(p)}
                          onCheckedChange={() => togglePerm(p)}
                        />
                        {PERMISSION_LABELS[p as Permission]}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending || !label.trim()}>
            {pending ? "Saving..." : mode === "create" ? "Create role" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
