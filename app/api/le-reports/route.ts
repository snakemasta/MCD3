import { getCurrentUserSafe } from "@/lib/session"
import { db } from "@/lib/db"
import { leReports } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserSafe()
    if (!user || !user.interfaces.includes("le")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const url = new URL(req.url)
    const status = url.searchParams.get("status")

    let query = db.select().from(leReports).where(eq(leReports.officerId, user.id))

    if (status) {
      query = db
        .select()
        .from(leReports)
        .where(eq(leReports.officerId, user.id) && eq(leReports.status, status))
    }

    const reports = await query

    return Response.json(reports)
  } catch (err) {
    console.error(err)
    return new Response("Internal Server Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserSafe()
    if (!user || !user.interfaces.includes("le")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }
    const body = await req.json()

    const [report] = await db
      .insert(leReports)
      .values({
        reportNumber: body.reportNumber,
        title: body.title,
        incidentType: body.incidentType,
        incidentDate: body.incidentDate ? new Date(body.incidentDate) : null,
        incidentLocation: body.incidentLocation,
        agency: body.agency,
        officerId: user.id,
        officerName: body.officerName,
        badgeNumber: body.badgeNumber,
        suspectName: body.suspectName,
        suspectDescription: body.suspectDescription,
        proposedCharges: body.proposedCharges,
        narrative: body.narrative,
        probableCause: body.probableCause,
        priority: body.priority || "normal",
        status: "submitted",
      })
      .returning()

    return Response.json(report)
  } catch (err) {
    console.error(err)
    return new Response("Internal Server Error", { status: 500 })
  }
}
