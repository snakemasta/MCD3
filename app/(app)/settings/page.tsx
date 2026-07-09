import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { profile, user } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"
import { PageHeader } from "@/components/page-header"
import { SettingsForm } from "@/components/settings-form"
import { NotificationPreferencesForm } from "@/components/notification-preferences-form"
import { getNotificationPreferences } from "@/lib/notification-preferences"
import type { Role } from "@/lib/constants"

export default async function SettingsPage() {
  const current = await getCurrentUser()
  if (!current) redirect("/sign-in")

  const [row] = await db
    .select({
      userId: profile.userId,
      name: user.name,
      email: user.email,
      role: profile.role,
      title: profile.title,
      available: profile.available,
      specialties: profile.specialties,
    })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(eq(profile.userId, current.id))
    .limit(1)

  if (!row) redirect("/sign-in")

  const notificationPrefs = await getNotificationPreferences(current.id, current.role)

  return (
    <div className="flex flex-col">
      <PageHeader title="Settings" description="Manage your profile, availability, and session." />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 sm:p-6 lg:p-8">
        <SettingsForm
          profile={{
            ...row,
            role: row.role as Role,
            specialties: row.specialties ?? [],
          }}
        />
        <NotificationPreferencesForm initial={notificationPrefs} />
      </div>
    </div>
  )
}
