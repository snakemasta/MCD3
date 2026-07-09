import Link from "next/link"
import { notFound } from "next/navigation"
import { Scale, Gavel, ArrowRight } from "lucide-react"
import { requireCivilian } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { enabledRequestTypes } from "@/lib/intake-config"
import { Card, CardContent } from "@/components/ui/card"

const TYPE_META: Record<
  string,
  { icon: typeof Scale; blurb: string }
> = {
  civil: {
    icon: Scale,
    blurb:
      "Pursue or respond to a lawsuit — contracts, property, landlord/tenant, injury, employment, and more.",
  },
  criminal: {
    icon: Gavel,
    blurb:
      "Get help contesting a criminal charge, citation, or arrest. The sooner you reach out, the better.",
  },
}

export default async function NewRequestPage() {
  await requireCivilian()
  const settings = await getSettings("civilian")
  const types = enabledRequestTypes(settings)

  if (types.length === 0) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Start a New Request</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Choose the type of legal help you need. We&apos;ll ask a few questions and our
          team will review your request.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {types.map((t) => {
          const meta = TYPE_META[t.value] ?? { icon: Scale, blurb: "" }
          const Icon = meta.icon
          return (
            <Link key={t.value} href={`/portal/new/${t.value}`} className="group">
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30">
                <CardContent className="flex h-full flex-col gap-3 py-6">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-6" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold">{t.label}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                      {meta.blurb}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Get started
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
