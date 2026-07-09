import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { AssistantView } from "@/components/assistant-view"

export default async function AssistantPage() {
  const current = await getCurrentUser()
  if (!current) redirect("/sign-in")
  return <AssistantView />
}
