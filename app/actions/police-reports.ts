"use server"

import { and, desc, eq, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  cases,
  evidence,
  leReports,
  leReportLinks,
  leReportWitnesses,
} from "@/lib/db/schema"
import { requireStaff } from "@/lib/session"
import { logAudit } from "@/lib/audit"

/**
 * Staff-facing list of all police reports. Gated on `report:view-all`, which is
 * granted to defense + prosecution staff (and admins) by default, and can be
 * granted to individual law-enforcement users by an admin.
 */
export async function listPoliceReports() {
  const current = await requireStaff()
  if (!current.permissions.includes("report:view-all")) {
    throw new Error("You do not have permission to view police reports")
  }
  return db
    .select({
      id: leReports.id,
      reportNumber: leReports.reportNumber,
      title: leReports.title,
      incidentType: leReports.incidentType,
      incidentDate: leReports.incidentDate,
      agency: leReports.agency,
      officerName: leReports.officerName,
      priority: leReports.priority,
      status: leReports.status,
      createdAt: leReports.createdAt,
    })
    .from(leReports)
    .orderBy(desc(leReports.createdAt))
}

/** Full read-only report (with links + witnesses) for the shared viewer. */
export async function getPoliceReport(id: string) {
  const current = await requireStaff()
  if (!current.permissions.includes("report:view-all")) {
    throw new Error("You do not have permission to view police reports")
  }
  const [report] = await db.select().from(leReports).where(eq(leReports.id, id))
  if (!report) return null
  const [links, witnesses] = await Promise.all([
    db.select().from(leReportLinks).where(eq(leReportLinks.reportId, id)),
    db.select().from(leReportWitnesses).where(eq(leReportWitnesses.reportId, id)),
  ])
  return { report, links, witnesses }
}

/**
 * Cases the current staff member can attach evidence to. Defense staff see all
 * defense cases; everyone with the permission can pick a destination case.
 */
export async function listCasesForEvidence() {
  const current = await requireStaff()
  if (!current.permissions.includes("evidence:add-report")) {
    throw new Error("You do not have permission to add reports to evidence")
  }
  return db
    .select({
      id: cases.id,
      title: cases.title,
      caseNumber: cases.caseNumber,
      clientName: cases.clientName,
      status: cases.status,
    })
    .from(cases)
    .where(ne(cases.status, "closed"))
    .orderBy(desc(cases.updatedAt))
}

/**
 * Copy a police report into a case's Evidence Locker as a tracked evidence
 * item. The report narrative becomes the description and its attachment links
 * are carried over. Idempotent per (case, report): re-adding is blocked.
 */
export async function addReportToCaseEvidence(input: {
  reportId: string
  caseId: string
}) {
  const current = await requireStaff()
  if (!current.permissions.includes("evidence:add-report")) {
    throw new Error("You do not have permission to add reports to evidence")
  }

  const [report] = await db
    .select()
    .from(leReports)
    .where(eq(leReports.id, input.reportId))
  if (!report) throw new Error("Police report not found")

  const [destCase] = await db
    .select({ id: cases.id, title: cases.title })
    .from(cases)
    .where(eq(cases.id, input.caseId))
  if (!destCase) throw new Error("Case not found")

  // Block duplicates: same report already in this case's locker.
  const existing = await db
    .select({ id: evidence.id })
    .from(evidence)
    .where(
      and(
        eq(evidence.caseId, input.caseId),
        eq(evidence.policeReportId, input.reportId),
      ),
    )
    .limit(1)
  if (existing.length) {
    throw new Error("This police report is already in the case evidence locker")
  }

  const links = await db
    .select()
    .from(leReportLinks)
    .where(eq(leReportLinks.reportId, input.reportId))

  const descriptionParts = [
    `Police report ${report.reportNumber}` +
      (report.agency ? ` (${report.agency})` : "") +
      (report.officerName ? ` filed by ${report.officerName}` : ""),
    report.proposedCharges ? `Proposed charges: ${report.proposedCharges}` : "",
    "",
    report.narrative,
  ].filter(Boolean)

  const [inserted] = await db
    .insert(evidence)
    .values({
      caseId: input.caseId,
      title: `Police Report: ${report.title}`,
      evidenceType: "document",
      link: links[0]?.url ?? null,
      description: descriptionParts.join("\n"),
      status: "pending_review",
      relatedCharge: report.proposedCharges ?? null,
      addedById: current.id,
      source: "police_report",
      policeReportId: report.id,
      externalLinks: links.map((l) => ({
        label: l.label,
        url: l.url,
        kind: l.kind,
      })),
    })
    .returning()

  await logAudit({
    actorId: current.id,
    actorName: current.name,
    action: "evidence.add_report",
    category: "evidence",
    targetType: "evidence",
    targetId: inserted.id,
    summary: `Added police report ${report.reportNumber} to case "${destCase.title}" evidence locker`,
    metadata: {
      caseId: input.caseId,
      reportId: input.reportId,
      reportNumber: report.reportNumber,
    },
  })

  revalidatePath(`/cases/${input.caseId}`)
  revalidatePath(`/reports/${input.reportId}`)
  return { id: inserted.id }
}

/** Cases that already contain this report (to show "already added" state). */
export async function getCasesWithReport(reportId: string) {
  const current = await requireStaff()
  if (!current.permissions.includes("report:view-all")) {
    throw new Error("You do not have permission to view police reports")
  }
  const rows = await db
    .select({ caseId: evidence.caseId })
    .from(evidence)
    .where(eq(evidence.policeReportId, reportId))
  return [...new Set(rows.map((r) => r.caseId))]
}
