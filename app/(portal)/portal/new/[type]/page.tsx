import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requireCivilian } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { enabledRequestTypes, resolveFields, resolveUrgencyLevels } from "@/lib/intake-config"
import { labelOf, INTAKE_TYPES } from "@/lib/constants"
import { IntakeForm } from "@/components/portal/intake-form"

export default async function TypedIntakePage({
  params,
}: {
  params: Promise<{ type: string }>
}) {
  const { type } = await params
  const me = await requireCivilian()
  const settings = await getSettings("civilian")

  const allowed = enabledRequestTypes(settings).map((t) => t.value as string)
  if (!allowed.includes(type)) notFound()

  const fields = resolveFields(type, settings)
  const urgencyLevels = resolveUrgencyLevels(settings)
  const typeLabel = labelOf(INTAKE_TYPES, type)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/portal/new"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Choose a different type
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{typeLabel} Request</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Tell us what happened. Fields marked with an asterisk are required. Everything
          you share is kept confidential with our legal team.
        </p>
      </div>

      <IntakeForm
        type={type}
        typeLabel={typeLabel}
        fields={fields}
        urgencyLevels={urgencyLevels}
        defaults={{ fullName: me.name, email: me.email }}
      />
    </div>
  )
}
