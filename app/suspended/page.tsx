import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { SuspendedNotice } from "@/components/suspended-notice"

export default async function SuspendedPage() {
  const current = await getCurrentUser()
  // Not signed in at all → go to sign-in. Active users don't belong here.
  if (!current) redirect("/sign-in")
  if (!current.disabled) redirect("/dashboard")
  return <SuspendedNotice email={current.email} />
}
