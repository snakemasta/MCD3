import { redirect } from "next/navigation"
import { listTeam } from "@/app/actions/team"
import { getCurrentUser } from "@/lib/session"
import { PageHeader } from "@/components/page-header"
import { TeamList } from "@/components/team-list"

export default async function TeamPage() {
  const current = await getCurrentUser()
  if (!current) redirect("/sign-in")

  const members = await listTeam()

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Team Members"
        description="Office roster, roles, specialties, and current caseload. Admins can adjust roles and availability."
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <TeamList members={members} viewerRole={current.role} />
      </div>
    </div>
  )
}
