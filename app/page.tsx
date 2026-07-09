import { redirect } from "next/navigation"
import { getCurrentUser, homePathForUser } from "@/lib/session"

export default async function Home() {
  const current = await getCurrentUser()
  if (!current) redirect("/sign-in")
  redirect(homePathForUser(current))
}
