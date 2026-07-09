"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { KeyRound, RefreshCw, Search, ShieldAlert, SlidersHorizontal, Trash2 } from "lucide-react"
import type { AdminUser } from "@/app/actions/admin"
import { adminDeleteUser, adminResetUserPassword, adminUpdateUser } from "@/app/actions/admin"
import {
  SPECIALTIES,
  APP_INTERFACES,
  interfacesForRoles,
  type AppInterface,
} from "@/lib/constants"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { Users } from "lucide-react"

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

interface RoleOption {
  key: string
  label: string
}

export function UsersManager({
  initialUsers,
  roles,
  currentUserId,
}: {
  initialUsers: AdminUser[]
  roles: RoleOption[]
  currentUserId: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [editing, setEditing] = useState<AdminUser | null>(null)

  const roleItems = useMemo(
    () => Object.fromEntries(roles.map((r) => [r.key, r.label])),
    [roles],
  )

  const filtered = useMemo(() => {
    return initialUsers.filter((u) => {
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !u.disabled) ||
        (statusFilter === "disabled" && u.disabled)
      const matchesRole = roleFilter === "all" || u.roles.includes(roleFilter)
      return matchesSearch && matchesStatus && matchesRole
    })
  }, [initialUsers, search, statusFilter, roleFilter])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="pl-9"
          />
        </div>
        <Select
          items={{ all: "All roles", ...roleItems }}
          value={roleFilter}
          onValueChange={(v) => setRoleFilter(v ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.key} value={r.key}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          items={{ all: "All statuses", active: "Active", disabled: "Disabled" }}
          value={statusFilter}
          onValueChange={(v) => setStatusFilter((v as typeof statusFilter) ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No matching users</EmptyTitle>
            <EmptyDescription>
              Adjust your search or filters to find team members.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((u) => (
            <UserRow
              key={u.userId}
              user={u}
              roles={roles}
              roleItems={roleItems}
              isSelf={u.userId === currentUserId}
              onEdit={() => setEditing(u)}
            />
          ))}
        </div>
      )}

      <EditUserDialog
        user={editing}
        roles={roles}
        roleItems={roleItems}
        isSelf={editing?.userId === currentUserId}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          router.refresh()
        }}
      />
    </div>
  )
}

function UserRow({
  user,
  roles,
  roleItems,
  isSelf,
  onEdit,
}: {
  user: AdminUser
  roles: RoleOption[]
  roleItems: Record<string, string>
  isSelf: boolean
  onEdit: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Interfaces this user can actually reach (roles, narrowed by admin override).
  const accessibleInterfaces = useMemo(() => {
    const base = user.roles.includes("admin")
      ? APP_INTERFACES.map((i) => i.id)
      : interfacesForRoles(user.roles)
    return user.allowedInterfaces
      ? base.filter((id) => user.allowedInterfaces!.includes(id))
      : base
  }, [user.roles, user.allowedInterfaces])

  function toggleDisabled(next: boolean) {
    startTransition(async () => {
      try {
        await adminUpdateUser({ userId: user.userId, disabled: next })
        toast.success(next ? "Account disabled" : "Account enabled")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update account")
      }
    })
  }

  return (
    <Card className={user.disabled ? "opacity-70" : undefined}>
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar className="size-10">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{user.name}</p>
              {isSelf && (
                <Badge variant="outline" className="font-normal">
                  You
                </Badge>
              )}
              {user.disabled && (
                <Badge variant="destructive" className="font-normal">
                  Disabled
                </Badge>
              )}
            </div>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2 lg:max-w-xs lg:flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {user.roles.map((r) => (
              <Badge
                key={r}
                variant={r === user.role ? "default" : "secondary"}
                className="font-normal"
              >
                {roleItems[r] ?? r}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {accessibleInterfaces.length === 0 ? (
              <span className="text-xs text-muted-foreground">No interface access</span>
            ) : (
              accessibleInterfaces.map((id) => (
                <Badge key={id} variant="outline" className="font-normal text-xs">
                  {APP_INTERFACES.find((i) => i.id === id)?.label ?? id}
                </Badge>
              ))
            )}
            {user.allowedInterfaces && (
              <Badge variant="outline" className="font-normal text-xs text-amber-600 dark:text-amber-500">
                restricted
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{user.activeCaseCount} active</Badge>
          {user.maxActiveCases != null && (
            <Badge variant="outline" className="font-normal">
              max {user.maxActiveCases}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 lg:w-auto">
          <div className="flex items-center gap-1.5">
            <Switch
              checked={!user.disabled}
              onCheckedChange={(v) => toggleDisabled(!v)}
              disabled={pending}
              aria-label="Account enabled"
            />
          </div>

          <Button variant="outline" size="sm" onClick={onEdit}>
            <SlidersHorizontal data-icon="inline-start" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EditUserDialog({
  user,
  roles,
  roleItems,
  isSelf,
  onClose,
  onSaved,
}: {
  user: AdminUser | null
  roles: RoleOption[]
  roleItems: Record<string, string>
  isSelf: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [userRoleList, setUserRoleList] = useState<string[]>([])
  const [restrictInterfaces, setRestrictInterfaces] = useState(false)
  const [allowedInterfaces, setAllowedInterfaces] = useState<string[]>([])
  const [title, setTitle] = useState("")
  const [available, setAvailable] = useState(true)
  const [maxCases, setMaxCases] = useState<string>("")
  const [specialties, setSpecialties] = useState<string[]>([])
  const [initialized, setInitialized] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [resetPending, startReset] = useTransition()
  const [deletePending, startDelete] = useTransition()

  // Sync form state when the dialog target changes.
  if (user && initialized !== user.userId) {
    setName(user.name)
    setUserRoleList(user.roles)
    setRestrictInterfaces(user.allowedInterfaces != null)
    setAllowedInterfaces(user.allowedInterfaces ?? [])
    setTitle(user.title ?? "")
    setAvailable(user.available)
    setMaxCases(user.maxActiveCases != null ? String(user.maxActiveCases) : "")
    setSpecialties(user.specialties)
    setNewPassword("")
    setInitialized(user.userId)
  }

  // Interfaces granted by the currently selected roles (admins get all).
  const grantedInterfaces: AppInterface[] = userRoleList.includes("admin")
    ? APP_INTERFACES.map((i) => i.id)
    : interfacesForRoles(userRoleList)

  function toggleRole(key: string) {
    setUserRoleList((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key],
    )
  }

  function toggleAllowedInterface(id: string) {
    setAllowedInterfaces((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%"
    const bytes = new Uint32Array(16)
    crypto.getRandomValues(bytes)
    setNewPassword(Array.from(bytes, (b) => chars[b % chars.length]).join(""))
  }

  function resetPassword() {
    if (!user) return
    startReset(async () => {
      try {
        await adminResetUserPassword({ userId: user.userId, newPassword })
        toast.success(`Password reset for ${user.name}. They'll need to sign in again.`)
        setNewPassword("")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to reset password")
      }
    })
  }

  function deleteUser() {
    if (!user) return
    startDelete(async () => {
      try {
        await adminDeleteUser({ userId: user.userId })
        toast.success(`${user.name} has been deleted`)
        onSaved()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete user")
      }
    })
  }

  function toggleSpecialty(s: string) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    )
  }

  function save() {
    if (!user) return
    if (!name.trim()) {
      toast.error("Name cannot be empty")
      return
    }
    if (userRoleList.length === 0) {
      toast.error("Select at least one role")
      return
    }
    // When restricting, persist the intersection of granted + checked
    // interfaces; otherwise null lets access derive purely from roles.
    const nextAllowed = restrictInterfaces
      ? grantedInterfaces.filter((id) => allowedInterfaces.includes(id))
      : null
    startTransition(async () => {
      try {
        await adminUpdateUser({
          userId: user.userId,
          name: name.trim(),
          roles: userRoleList,
          allowedInterfaces: nextAllowed,
          title: title.trim() || null,
          available,
          specialties,
          maxActiveCases: maxCases.trim() ? Number(maxCases) : null,
        })
        toast.success("User updated")
        onSaved()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save")
      }
    })
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {user?.name}</DialogTitle>
          <DialogDescription>
            Update this member&apos;s role, profile, and case capacity.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
          <Field>
            <FieldLabel htmlFor="edit-name">Name</FieldLabel>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </Field>

          <Field>
            <FieldLabel>Roles</FieldLabel>
            <FieldDescription>
              Assign one or more roles. Each role grants access to its interface.
            </FieldDescription>
            <div className="flex flex-wrap gap-2 pt-1">
              {roles.map((r) => {
                const active = userRoleList.includes(r.key)
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => toggleRole(r.key)}
                    aria-pressed={active}
                  >
                    <Badge
                      variant={active ? "default" : "outline"}
                      className="cursor-pointer font-normal"
                    >
                      {r.label}
                    </Badge>
                  </button>
                )
              })}
            </div>
            {isSelf && (
              <FieldDescription className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                <ShieldAlert className="size-3.5" />
                Be careful changing your own roles — you may lose admin access.
              </FieldDescription>
            )}
          </Field>

          <Field>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="restrict-interfaces">Restrict interface access</FieldLabel>
              <Switch
                id="restrict-interfaces"
                checked={restrictInterfaces}
                onCheckedChange={(v) => {
                  setRestrictInterfaces(v)
                  // Default the allow-list to everything roles grant.
                  if (v && allowedInterfaces.length === 0) {
                    setAllowedInterfaces(grantedInterfaces)
                  }
                }}
              />
            </div>
            <FieldDescription>
              {restrictInterfaces
                ? "Only the interfaces checked below will be available to this user."
                : "Access is derived from the assigned roles. Turn on to hide specific interfaces."}
            </FieldDescription>
            {restrictInterfaces && (
              <div className="flex flex-col gap-2 pt-1">
                {grantedInterfaces.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Assign a role to grant interface access.
                  </p>
                ) : (
                  grantedInterfaces.map((id) => {
                    const def = APP_INTERFACES.find((i) => i.id === id)!
                    const checked = allowedInterfaces.includes(id)
                    return (
                      <label
                        key={id}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-md border p-2.5"
                      >
                        <span className="flex flex-col">
                          <span className="text-sm font-medium">{def.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {def.description}
                          </span>
                        </span>
                        <Switch
                          checked={checked}
                          onCheckedChange={() => toggleAllowedInterface(id)}
                        />
                      </label>
                    )
                  })
                )}
              </div>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-title">Title</FieldLabel>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Trial Attorney"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-max">Max active cases</FieldLabel>
            <Input
              id="edit-max"
              type="number"
              min={0}
              value={maxCases}
              onChange={(e) => setMaxCases(e.target.value)}
              placeholder="Use office default"
            />
            <FieldDescription>
              Overrides the office-wide default used by auto-assignment.
            </FieldDescription>
          </Field>

          <Field orientation="horizontal">
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="edit-available">Available for assignment</FieldLabel>
              <FieldDescription>
                When off, auto-assignment skips this member.
              </FieldDescription>
            </div>
            <Switch
              id="edit-available"
              checked={available}
              onCheckedChange={setAvailable}
            />
          </Field>

          <Field>
            <FieldLabel>Specialties</FieldLabel>
            <div className="flex flex-wrap gap-2 pt-1">
              {SPECIALTIES.map((s) => {
                const active = specialties.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpecialty(s)}
                    aria-pressed={active}
                  >
                    <Badge
                      variant={active ? "default" : "outline"}
                      className="cursor-pointer font-normal"
                    >
                      {s}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </Field>

          <div className="border-t pt-4">
            <Field>
              <FieldLabel htmlFor="reset-password" className="flex items-center gap-1.5">
                <KeyRound className="size-3.5" />
                Reset password
              </FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="reset-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 8 characters)"
                  autoComplete="new-password"
                  spellCheck={false}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generatePassword}
                  aria-label="Generate a random password"
                  title="Generate a random password"
                >
                  <RefreshCw />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetPassword}
                  disabled={resetPending || newPassword.length < 8}
                >
                  {resetPending ? "Setting..." : "Set"}
                </Button>
              </div>
              <FieldDescription>
                Sets a new password immediately and signs the user out of all
                sessions. Share it with them over a secure channel.
              </FieldDescription>
            </Field>
          </div>

          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                  <Trash2 className="size-3.5" />
                  Delete account
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isSelf
                    ? "You cannot delete your own account."
                    : "Permanently removes this user. Their cases and records are preserved and reassigned."}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isSelf || deletePending}
                      className="shrink-0"
                    >
                      {deletePending ? "Deleting..." : "Delete"}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {user?.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes {user?.email} and signs them out
                      everywhere. Cases, evidence, and documents they created
                      are kept and reassigned to you. This action cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={deleteUser}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      Delete user
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
