import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Page() {
  const items = ['Aliases and identifiers', 'Case relationships', 'Gang/drug/intel links', 'Known vehicles and addresses']
  return (
    <div className="flex flex-col">
      <PageHeader title={'Master Person Database'} description={'Single master profile system for suspects, victims, witnesses, associates, informants, and persons of interest.'} />
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
