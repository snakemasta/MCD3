import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Page() {
  const items = ['Probable cause summary', 'Evidence index', 'Witness/suspect list', 'Supervisor approval checklist']
  return (
    <div className="flex flex-col">
      <PageHeader title={'Court Packet Builder'} description={'Assemble court-ready packets with probable cause, reports, evidence summaries, witness lists, and warrant history.'} />
      <div className="grid gap-4 p-4 sm:p-6 lg:p-8 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item}>
            <CardHeader>
              <CardTitle className="text-base">{item}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Module shell added for the MCD conversion. Connect this card to forms, tables, and database actions as the next build phase.
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
