import { redirect } from "next/navigation"
import { getCurrentUser, homePathForUser } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { RegisterForm } from "@/components/portal/register-form"

export default async function RegisterPage() {
  const current = await getCurrentUser()
  if (current) redirect(homePathForUser(current))

  const [civilian, system] = await Promise.all([
    getSettings("civilian"),
    getSettings("system"),
  ])
  if (!civilian.registrationEnabled) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">Registration unavailable</h1>
          <p className="mt-2 text-pretty text-sm text-muted-foreground">
            Online client registration is currently closed. Please contact the
            office directly to start a new request.
          </p>
        </div>
      </div>
    )
  }

  return <RegisterForm mode="sign-up" firmName={system.firmName || "MCD CaseOps Platform"} />
}
