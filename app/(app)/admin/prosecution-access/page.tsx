import { getSettingsForAdmin } from "@/app/actions/admin"
import { PROSECUTION_SECTIONS } from "@/lib/prosecution-access"
import { ProsecutionAccessForm } from "@/components/admin/prosecution-access-form"

export default async function ProsecutionAccessPage() {
  const settings = await getSettingsForAdmin("prosecution")

  const sectionDefs = PROSECUTION_SECTIONS.map((s) => ({
    id: s.id,
    label: s.label,
    description: s.description,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Prosecution Access</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Control what prosecutors and state attorneys can see when they open the shared case file for a
          defense-created case. Defense notes, defense AI, and civilian records are private by default and
          all rules are enforced server-side.
        </p>
      </div>

      <ProsecutionAccessForm settings={settings} sectionDefs={sectionDefs} />
    </div>
  )
}
