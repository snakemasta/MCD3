"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LogOut, KeyRound } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { updateMember } from "@/app/actions/team"
import { SPECIALTIES, labelOf, ROLES, type Role } from "@/lib/constants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { RoleBadge } from "@/components/case-badges"

interface SettingsFormProps {
  profile: {
    userId: string
    name: string
    email: string
    role: Role
    title: string | null
    available: boolean
    specialties: string[]
  }
}

export function SettingsForm({ profile }: SettingsFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState(profile.title ?? "")
  const [available, setAvailable] = useState(profile.available)
  const [specialties, setSpecialties] = useState<string[]>(profile.specialties)

  const [name, setName] = useState(profile.name)
  const [namePending, startName] = useTransition()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwPending, startPassword] = useTransition()

  function toggleSpecialty(s: string) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    )
  }

  function saveName() {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      toast.error("Name must be at least 2 characters")
      return
    }
    startName(async () => {
      const { error } = await authClient.updateUser({ name: trimmed })
      if (error) {
        toast.error(error.message ?? "Failed to update name")
        return
      }
      toast.success("Name updated")
      router.refresh()
    })
  }

  function changePassword() {
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    startPassword(async () => {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      })
      if (error) {
        toast.error(error.message ?? "Failed to change password")
        return
      }
      toast.success("Password changed. Other sessions have been signed out.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    })
  }

  function save() {
    startTransition(async () => {
      try {
        await updateMember({
          userId: profile.userId,
          title: title.trim() || null,
          available,
          specialties,
        })
        toast.success("Profile updated")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save")
      }
    })
  }

  async function signOut() {
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account details and current role.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <RoleBadge role={profile.role} />
          </div>

          <Field>
            <FieldLabel htmlFor="display-name">Display name</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
              <Button
                onClick={saveName}
                disabled={namePending || name.trim() === profile.name}
              >
                {namePending ? "Saving..." : "Save"}
              </Button>
            </div>
            <FieldDescription>
              This is the name shown across the app and on assigned cases.
            </FieldDescription>
          </Field>

          <p className="text-xs text-muted-foreground">
            Your role ({labelOf(ROLES, profile.role)}) is managed by an administrator from the Team Members page.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile & Availability</CardTitle>
          <CardDescription>
            This information powers automatic case assignment. Keep your specialties and availability up to date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Trial Attorney"
              />
            </Field>

            <Field orientation="horizontal">
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="available">Available for assignment</FieldLabel>
                <FieldDescription>
                  When off, the auto-assignment engine will skip you for new cases.
                </FieldDescription>
              </div>
              <Switch id="available" checked={available} onCheckedChange={setAvailable} />
            </Field>

            <Field>
              <FieldLabel>Specialties</FieldLabel>
              <FieldDescription>
                Select the practice areas you handle. Matching specialties boost your assignment score.
              </FieldDescription>
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
          </FieldGroup>

          <div className="mt-6 flex justify-end">
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password. For your security, changing it signs you out of all other devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="current-password">Current password</FieldLabel>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
          </FieldGroup>
          <div className="mt-6 flex justify-end">
            <Button
              onClick={changePassword}
              disabled={
                pwPending ||
                !currentPassword ||
                newPassword.length < 8 ||
                !confirmPassword
              }
            >
              {pwPending ? "Updating..." : "Update password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Sign out of MCD CaseOps Platform on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={signOut}>
            <LogOut data-icon="inline-start" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
