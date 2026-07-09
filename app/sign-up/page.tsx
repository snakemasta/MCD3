import { redirect } from "next/navigation"
import { getCurrentUser, homePathForUser } from "@/lib/session"
import { AuthForm } from "@/components/auth-form"

export default async function SignUpPage() {
  const current = await getCurrentUser()
  if (current) redirect(homePathForUser(current))
  return <AuthForm mode="sign-up" />
}
