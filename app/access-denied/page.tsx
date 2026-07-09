import { redirect } from "next/navigation"
import { getCurrentUser, homePathForUser } from "@/lib/session"
import { AccessDeniedNotice } from "@/components/access-denied-notice"

export default async function AccessDeniedPage() {
  const current = await getCurrentUser()
  if (!current) redirect("/sign-in")
  if (current.disabled) redirect("/suspended")
  // If the user actually has an interface available, send them to it.
  if (current.interfaces.length > 0) redirect(homePathForUser(current))
  return <AccessDeniedNotice email={current.email} />
}
