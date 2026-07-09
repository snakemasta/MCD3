import "server-only"
import { and, eq, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { caseAccess } from "@/lib/db/schema"
import { getSettings } from "@/lib/settings"
import type { CurrentUser } from "@/lib/session"

/**
 * Server-side access policy for the Prosecution / State Attorney interface.
 *
 * Prosecutors and State Attorneys can view the shared case file for any active
 * case (defense- or prosecution-created), EXCEPT civilian intake data and
 * private defense strategy (notes, attorney-client privileged notes, and
 * defense AI output) unless an admin explicitly shares them.
 *
 * These rules are enforced here, on the server, and must not rely on hiding UI.
 */

/** The roles that use the shared Prosecution interface. */
const PROSECUTION_ROLE_KEYS = ["state_attorney", "prosecutor"]

/** Sections of a case that an admin can grant or revoke for prosecutors. */
export const PROSECUTION_SECTIONS: { id: string; label: string; description: string }[] = [
  { id: "overview", label: "Case Overview", description: "Title, defendant, agency, and key facts." },
  { id: "charges", label: "Charges", description: "Filed and proposed charges." },
  { id: "courtDates", label: "Court Dates", description: "Hearings and filing deadlines." },
  { id: "evidence", label: "Evidence Locker", description: "Shared evidence items." },
  { id: "policeReports", label: "Police Reports", description: "Linked incident reports." },
  { id: "warrants", label: "Warrants", description: "Warrants linked to the case." },
  { id: "motions", label: "Motions", description: "Motions and drafts filed on the case." },
  { id: "timeline", label: "Timeline", description: "Chronological case events." },
  { id: "lawLibrary", label: "Penal Code / SOP Bank Links", description: "Statutes and authorities." },
  { id: "status", label: "Case Status", description: "Current case status." },
  { id: "rulings", label: "Judicial Rulings", description: "Warrant and motion decisions." },
]

export type ProsecutionSectionId = (typeof PROSECUTION_SECTIONS)[number]["id"]

/** The fully resolved visibility policy for one prosecutor viewing one case. */
export interface ProsecutionCaseAccess {
  /** Whether the prosecution user may view this case at all. */
  canView: boolean
  /** True when the case belongs to the prosecution's own side. */
  isOwnCase: boolean
  /** Visible case sections, keyed by section id. */
  sections: Record<string, boolean>
  /** May read internal defense notes / attorney-client privileged notes. */
  canViewDefenseNotes: boolean
  /** May read defense AI private strategy output. */
  canViewDefenseAi: boolean
  /** May see civilian intake data and civilian messages. */
  canViewCivilianRecords: boolean
  /** May see the evidence locker contents. */
  canViewEvidence: boolean
}

/** Whether a user belongs to the prosecution side. */
export function isProsecutionUser(user: Pick<CurrentUser, "roles" | "role">): boolean {
  const roles = user.roles?.length ? user.roles : [user.role]
  return roles.some((r) => PROSECUTION_ROLE_KEYS.includes(r))
}

type CaseSideRow = { id: string; side: string; status: string }

/**
 * Resolve what a prosecution user may see on a given case. Combines the global
 * admin settings with any per-case `case_access` grant for the prosecution
 * side or this specific user (per-case grants can only widen access).
 */
export async function getProsecutionCaseAccess(
  user: CurrentUser,
  caseRow: CaseSideRow,
): Promise<ProsecutionCaseAccess> {
  // Prosecution-side (own) cases: full access to the prosecution's own work
  // product. Civilian intake data still stays hidden by default.
  if (caseRow.side === "prosecution") {
    const allSections = Object.fromEntries(PROSECUTION_SECTIONS.map((s) => [s.id, true]))
    return {
      canView: true,
      isOwnCase: true,
      sections: allSections,
      canViewDefenseNotes: true,
      canViewDefenseAi: true,
      canViewCivilianRecords: false,
      canViewEvidence: true,
    }
  }

  // Defense-created (or other) cases: shared case file gated by admin settings.
  const settings = await getSettings("prosecution")

  // Per-case override grant (admin can mark specific things shared for a case).
  const [grant] = await db
    .select()
    .from(caseAccess)
    .where(
      and(
        eq(caseAccess.caseId, caseRow.id),
        or(eq(caseAccess.side, "prosecution"), eq(caseAccess.userId, user.id)),
      ),
    )
    .limit(1)

  const sections: Record<string, boolean> = {}
  for (const s of PROSECUTION_SECTIONS) {
    sections[s.id] = settings.sections?.[s.id] ?? true
  }

  // Notes: never shown when notes are separated; otherwise per the global flag.
  const notesVisible = settings.separateNotes ? false : settings.canViewDefenseNotes

  const canViewDefenseAi = settings.canViewDefenseAi || Boolean(grant?.canViewAi)
  const canViewCivilianRecords = settings.canViewCivilianRecords
  const canViewEvidence =
    (settings.shareEvidenceByDefault || Boolean(grant?.canViewEvidence)) && sections.evidence

  return {
    canView: true,
    isOwnCase: false,
    sections,
    canViewDefenseNotes: notesVisible,
    canViewDefenseAi,
    canViewCivilianRecords,
    canViewEvidence,
  }
}
