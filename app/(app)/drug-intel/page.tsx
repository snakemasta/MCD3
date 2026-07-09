import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Page() {
  const items = ['Drug categories', 'Supplier networks', 'Hot spots', 'Case/evidence links']
  return (
    <div className="flex flex-col">
      <PageHeader title={'Drug Intelligence'} description={'Track narcotics activity, suppliers, locations, patterns, and related evidence.'} />
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
