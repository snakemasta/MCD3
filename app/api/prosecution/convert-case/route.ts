import { getCurrentUserSafe } from "@/lib/session"
import { db } from "@/lib/db"
import { leReports, cases, prosecutionCharges } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { initializeProsecutionCaseAccess } from "@/lib/case-access"

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserSafe()
    if (!user || !user.interfaces.includes("prosecution")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    if (!user.permissions.includes("report:convert")) {
      return new Response("Forbidden", { status: 403 })
    }

    const body = await req.json()
    const { reportId } = body

    if (!reportId) {
      return new Response("Missing reportId", { status: 400 })
    }

    // Fetch the report
    const reports = await db.select().from(leReports).where(eq(leReports.id, reportId))
    if (!reports.length) {
      return new Response("Report not found", { status: 404 })
    }
    const report = reports[0]

    if (report.status !== "accepted") {
      return new Response("Report must be accepted before conversion", { status: 400 })
    }

    // Create a new prosecution case from the report
    const caseValues: any = {
      title: report.title,
      caseNumber: `PROS-${Date.now()}`,
      clientName: report.suspectName || "Unknown Suspect",
      side: "prosecution",
      sourceReportId: report.id,
      defendantName: report.suspectName,
      arrestingAgency: report.agency,
      leadOfficerId: report.officerId,
      probableCause: report.probableCause,
      incidentNarrative: report.narrative,
      charges: report.proposedCharges,
      priority: report.priority,
      status: "investigation",
    }
    const [newCase] = await db.insert(cases).values(caseValues).returning()

    // Initialize access controls for the new prosecution case
    await initializeProsecutionCaseAccess(newCase.id)

    // If the report lists proposed charges, add them
    if (report.proposedCharges) {
      const chargesList = report.proposedCharges.split(",").map((c) => c.trim())
      for (const charge of chargesList) {
        await db.insert(prosecutionCharges).values({
          caseId: newCase.id,
          statute: charge,
          description: `Proposed by ${report.officerName}`,
          status: "filed",
        })
      }
    }

    // Mark the report as converted
    await db
      .update(leReports)
      .set({
        status: "converted",
        convertedCaseId: newCase.id,
        updatedAt: new Date(),
      })
      .where(eq(leReports.id, reportId))

    return Response.json({
      case: newCase,
      message: `Report converted to case ${newCase.caseNumber}`,
    })
  } catch (err) {
    console.error(err)
    return new Response("Internal Server Error", { status: 500 })
  }
}
