import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  aiAnalyses,
  caseCivilianAccess,
  drafts,
  evidence,
  user,
} from "@/lib/db/schema"

export interface CaseClientAccess {
  civilianId: string
  name: string
  email: string
  canViewStatus: boolean
  canViewCourtDates: boolean
  canViewEvidence: boolean
  canSendMessages: boolean
  canAddEvidence: boolean
  canViewDrafts: boolean
  canViewAiSummaries: boolean
  canViewNotes: boolean
}

export interface ShareableItem {
  id: string
  label: string
  sharedWithCivilian: boolean
}

export interface CaseClientPanelData {
  clients: CaseClientAccess[]
  evidenceItems: ShareableItem[]
  draftItems: ShareableItem[]
  analysisItems: ShareableItem[]
}

/** Staff view of who can access a case via the informant portal, plus the
 * artifacts that can be individually shared. */
export async function getCaseClientPanel(
  caseId: string,
): Promise<CaseClientPanelData> {
  const accessRows = await db
    .select({
      civilianId: caseCivilianAccess.civilianId,
      canViewStatus: caseCivilianAccess.canViewStatus,
      canViewCourtDates: caseCivilianAccess.canViewCourtDates,
      canViewEvidence: caseCivilianAccess.canViewEvidence,
      canSendMessages: caseCivilianAccess.canSendMessages,
      canAddEvidence: caseCivilianAccess.canAddEvidence,
      canViewDrafts: caseCivilianAccess.canViewDrafts,
      canViewAiSummaries: caseCivilianAccess.canViewAiSummaries,
      canViewNotes: caseCivilianAccess.canViewNotes,
      name: user.name,
      email: user.email,
    })
    .from(caseCivilianAccess)
    .innerJoin(user, eq(user.id, caseCivilianAccess.civilianId))
    .where(eq(caseCivilianAccess.caseId, caseId))

  const [evRows, draftRows, analysisRows] = await Promise.all([
    db
      .select({
        id: evidence.id,
        label: evidence.title,
        sharedWithCivilian: evidence.sharedWithCivilian,
      })
      .from(evidence)
      .where(eq(evidence.caseId, caseId)),
    db
      .select({
        id: drafts.id,
        label: drafts.title,
        sharedWithCivilian: drafts.sharedWithCivilian,
      })
      .from(drafts)
      .where(eq(drafts.caseId, caseId)),
    db
      .select({
        id: aiAnalyses.id,
        createdAt: aiAnalyses.createdAt,
        sharedWithCivilian: aiAnalyses.sharedWithCivilian,
      })
      .from(aiAnalyses)
      .where(eq(aiAnalyses.caseId, caseId)),
  ])

  return {
    clients: accessRows,
    evidenceItems: evRows,
    draftItems: draftRows,
    analysisItems: analysisRows.map((a) => ({
      id: a.id,
      label: `AI Analysis · ${new Date(a.createdAt).toLocaleDateString()}`,
      sharedWithCivilian: a.sharedWithCivilian,
    })),
  }
}
