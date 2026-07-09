import { getCurrentUserSafe } from "@/lib/session"
import { db } from "@/lib/db"
import { leReports } from "@/lib/db/schema"
import { eq, inArray } from "drizzle-orm"

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserSafe()
    if (!user || !user.interfaces.includes("prosecution")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const url = new URL(req.url)
    const statusParam = url.searchParams.get("status")

    // Default: show "submitted" and "needs_info" reports
    const statuses = statusParam ? [statusParam] : ["submitted", "needs_info"]

    const reports = await db
      .select()
      .from(leReports)
      .where(inArray(leReports.status, statuses))

    return Response.json(reports)
  } catch (err) {
    console.error(err)
    return new Response("Internal Server Error", { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUserSafe()
    if (!user || !user.interfaces.includes("prosecution")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    if (!user.permissions.includes("report:review")) {
      return new Response("Forbidden", { status: 403 })
    }

    const body = await req.json()
    const { reportId, action, notes } = body

    if (!reportId || !action) {
      return new Response("Missing reportId or action", { status: 400 })
    }

    const updateData: Record<string, any> = {
      reviewerId: user.id,
      updatedAt: new Date(),
    }

    if (action === "accept") {
      updateData.status = "accepted"
      updateData.reviewNotes = notes || null
    } else if (action === "request-info") {
      updateData.status = "needs_info"
      updateData.infoRequest = notes || "Additional information requested"
    } else if (action === "reject") {
      updateData.status = "rejected"
      updateData.rejectionReason = notes || "Report rejected"
    } else {
      return new Response("Invalid action", { status: 400 })
    }

    const [report] = await db
      .update(leReports)
      .set(updateData)
      .where(eq(leReports.id, reportId))
      .returning()

    return Response.json(report)
  } catch (err) {
    console.error(err)
    return new Response("Internal Server Error", { status: 500 })
  }
}
