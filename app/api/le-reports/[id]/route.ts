import { getCurrentUserSafe } from "@/lib/session"
import { db } from "@/lib/db"
import { leReports, leReportLinks, leReportWitnesses } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserSafe()
    if (!user || !user.interfaces.includes("le")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }
    const { id } = await params

    const report = await db.select().from(leReports).where(eq(leReports.id, id)).limit(1)

    if (!report.length || report[0].officerId !== user.id) {
      return new Response("Not Found", { status: 404 })
    }

    const links = await db.select().from(leReportLinks).where(eq(leReportLinks.reportId, id))
    const witnesses = await db
      .select()
      .from(leReportWitnesses)
      .where(eq(leReportWitnesses.reportId, id))

    return Response.json({
      ...report[0],
      links,
      witnesses,
    })
  } catch (err) {
    console.error(err)
    return new Response("Internal Server Error", { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserSafe()
    if (!user || !user.interfaces.includes("le")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }
    const { id } = await params

    // Only officer who submitted can edit
    const report = await db.select().from(leReports).where(eq(leReports.id, id)).limit(1)
    if (!report.length || report[0].officerId !== user.id) {
      return new Response("Not Found", { status: 404 })
    }

    const body = await req.json()

    const [updated] = await db
      .update(leReports)
      .set({
        title: body.title,
        narrative: body.narrative,
        probableCause: body.probableCause,
        suspectDescription: body.suspectDescription,
        proposedCharges: body.proposedCharges,
        priority: body.priority,
        updatedAt: new Date(),
      })
      .where(eq(leReports.id, id))
      .returning()

    return Response.json(updated)
  } catch (err) {
    console.error(err)
    return new Response("Internal Server Error", { status: 500 })
  }
}
