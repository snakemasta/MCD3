import "server-only"
import { cache } from "react"
import { db } from "@/lib/db"
import { appSettings } from "@/lib/db/schema"

// --- Setting group shapes ---------------------------------------------------

export interface SystemSettings {
  appName: string
  firmName: string
  logoUrl: string
  timezone: string
  defaultCaseStatus: string
  defaultCasePriority: string
  dataRetentionDays: number
  maintenanceMode: boolean
  accessMode: "public" | "private"
}

export interface SecuritySettings {
  sessionTimeoutHours: number
  requireLogin: boolean
  disabledAccountBehavior: "block_login" | "read_only"
  inviteOnly: boolean
  caseVisibility: "all" | "assigned_only"
  teamVisibility: "all" | "admins_only"
  adminOnlyPages: boolean
}

export interface AiSettings {
  provider: string
  model: string
  generalPrompt: string
  attorneyPersonality: string
  analyzerRules: string
  scoringRules: string
  passThreshold: number
  requiredEvidenceChecklist: string[]
  aiEnabledByRole: Record<string, boolean>
  /** Whether the AI retrieves supporting context from the Memory Bank. */
  memoryBankRetrieval: boolean
  /** Whether the AI retrieves supporting context from the Penal Code / SOP Bank. */
  lawLibraryRetrieval: boolean
  /** Max number of knowledge entries to inject as AI context per request. */
  maxRetrievedEntries: number
  /** When true, AI answers must cite the sources they drew from. */
  requireCitations: boolean
}

export interface AutoAssignSettings {
  enabled: boolean
  assigningRoles: string[]
  maxActiveCasesDefault: number
  byCaseType: boolean
  byPriority: boolean
  byAvailability: boolean
  byWorkload: boolean
  manualOverride: boolean
  conflictCheck: boolean
}

export interface DashboardSettings {
  cards: Record<string, boolean>
}

export interface EvidenceSettings {
  allowedLinkTypes: string[]
  requiredSummaryFields: string[]
}

export interface TimelineSettings {
  overdueWarningDays: number
  courtDateReminderDays: number
  requiredEventsByCaseType: Record<string, string[]>
}

export interface CivilianFieldRule {
  enabled: boolean
  required: boolean
}

export interface CivilianSettings {
  /** Allow new clients to self-register for the portal. */
  registrationEnabled: boolean
  /** Which intake request types clients may submit. */
  requestTypes: { civil: boolean; criminal: boolean }
  /** Friendly welcome copy shown on the client dashboard. */
  welcomeMessage: string
  /** Optional label overrides for canonical statuses, keyed by status value. */
  statusLabels: Record<string, string>
  /** Extra admin-defined statuses appended to the workflow. */
  customStatuses: { value: string; label: string }[]
  /** Optional label overrides for urgency levels. */
  urgencyLabels: Record<string, string>
  /** Per-type, per-field enable/required overrides. */
  fieldConfig: Record<string, Record<string, CivilianFieldRule>>
  /** Roles eligible to be assigned as an intake reviewer. */
  reviewerRoles: string[]
  /** Default access flags applied when a client is linked to a new case. */
  defaultAccess: {
    canViewStatus: boolean
    canViewCourtDates: boolean
    canViewEvidence: boolean
    canSendMessages: boolean
    canAddEvidence: boolean
    canViewDrafts: boolean
    canViewAiSummaries: boolean
  }
}

export interface ProsecutionSettings {
  /**
   * Which sections of a defense-side case prosecutors / state attorneys may
   * see. Keyed by section id (see PROSECUTION_SECTIONS in
   * lib/prosecution-access.ts). Prosecution-side (own) cases are always fully
   * visible to the prosecution.
   */
  sections: Record<string, boolean>
  /** Allow prosecutors to read internal defense notes (case notes, strategy, case chat). */
  canViewDefenseNotes: boolean
  /** Allow prosecutors to read defense AI strategy output. */
  canViewDefenseAi: boolean
  /** Allow prosecutors to see civilian-linked records (intake, civilian messages). */
  canViewCivilianRecords: boolean
  /** Keep prosecution and defense notes separated (prosecutors never see defense notes inline). */
  separateNotes: boolean
  /** Share defense evidence with the prosecution by default (otherwise restricted per case). */
  shareEvidenceByDefault: boolean
}

export interface WarrantSettings {
  /** Extra warrant types appended to the built-in list. */
  customTypes: { value: string; label: string }[]
  /** Optional label overrides for canonical statuses, keyed by status value. */
  statusLabels: Record<string, string>
  /** Role keys permitted to submit warrants (informational; perms still enforced). */
  submitterRoles: string[]
  /** Role keys permitted to review warrants. */
  reviewerRoles: string[]
  /** Role keys permitted to approve/decide warrants. */
  approverRoles: string[]
  /** Role keys permitted to close out warrants. */
  closerRoles: string[]
  /** Required fields a warrant must have before it can be submitted. */
  requiredFields: string[]
  /** Required fields on the closeout form. */
  requiredCloseoutFields: string[]
  /** AI score thresholds. At/above pass = Pass; at/below highRisk = High Risk. */
  scoringThresholds: { pass: number; highRisk: number }
  /** Create a prosecution case automatically when a warrant is approved. */
  autoCreateProsecutionCase: boolean
  /** Create a defense case automatically when a defendant contests at closeout. */
  autoCreateDefenseCase: boolean
  /** Notification toggles. */
  notifyOfficerOnDecision: boolean
  notifyStateAttorneyOnApproval: boolean
  notifyDefenseOnContest: boolean
  /** Play an optional sound when a new notification arrives. */
  notificationSounds: boolean
}

export interface MotionSettings {
  /** Extra motion types appended to the built-in list. */
  customTypes: { value: string; label: string }[]
  /** Optional label overrides for canonical statuses, keyed by status value. */
  statusLabels: Record<string, string>
  /** Role keys permitted to review motions. */
  reviewerRoles: string[]
  /** Role keys permitted to rule on motions. */
  rulerRoles: string[]
  /** Required fields a motion must have before it can be filed. */
  requiredFields: string[]
  /** AI score thresholds. At/above pass = Strong; at/below weak = Weak. */
  scoringThresholds: { pass: number; weak: number }
  /** Notify the opposing party when a motion is filed. */
  notifyOpposingOnFiling: boolean
  /** Notify the filer when the judge rules. */
  notifyFilerOnRuling: boolean
  /** Notify assigned judges when a motion is filed. */
  notifyJudgeOnFiling: boolean
}

export interface NotificationSettings {
  /** Global master switch for notification sounds across the platform. */
  soundsEnabled: boolean
  /** Per-role gate. A role absent from the map defaults to enabled. */
  roleSoundEnabled: Record<string, boolean>
  /** Default sound type applied to users who haven't chosen one. */
  defaultSoundType: string
  /** Default volume (0-100) applied to users who haven't chosen one. */
  defaultVolume: number
}

export interface SettingsMap {
  system: SystemSettings
  security: SecuritySettings
  ai: AiSettings
  auto_assign: AutoAssignSettings
  dashboard: DashboardSettings
  evidence: EvidenceSettings
  timeline: TimelineSettings
  civilian: CivilianSettings
  warrant: WarrantSettings
  motion: MotionSettings
  notification: NotificationSettings
  prosecution: ProsecutionSettings
}

export type SettingsKey = keyof SettingsMap

export const DASHBOARD_CARDS: { key: string; label: string }[] = [
  { key: "openCases", label: "Open Cases" },
  { key: "assignedCases", label: "Assigned Cases" },
  { key: "urgentCases", label: "Urgent Cases" },
  { key: "overdueTasks", label: "Overdue Tasks" },
  { key: "upcomingCourtDates", label: "Upcoming Court Dates" },
  { key: "casesNeedingReview", label: "Cases Needing Review" },
  { key: "aiFlaggedCases", label: "AI Flagged Cases" },
  { key: "recentActivity", label: "Recent Activity" },
]

export const DEFAULT_SETTINGS: SettingsMap = {
  system: {
    appName: "MCD CaseOps Platform",
    firmName: "Major Crimes Division",
    logoUrl: "",
    timezone: "America/New_York",
    defaultCaseStatus: "intake",
    defaultCasePriority: "normal",
    dataRetentionDays: 365,
    maintenanceMode: false,
    accessMode: "private",
  },
  security: {
    sessionTimeoutHours: 168,
    requireLogin: true,
    disabledAccountBehavior: "block_login",
    inviteOnly: false,
    caseVisibility: "all",
    teamVisibility: "all",
    adminOnlyPages: true,
  },
  ai: {
    provider: "openai",
    model: "openai/gpt-5-mini",
    generalPrompt: "You are a helpful, knowledgeable legal assistant.",
    attorneyPersonality:
      "You are MCD CaseOps Platform, a sharp, plain-spoken criminal defense attorney who explains legal strategy clearly and aggressively defends the client.",
    analyzerRules:
      "Identify missing elements of the offense, weak or unsupported evidence, and conclusions not supported by facts in the report.",
    scoringRules:
      "Weigh probable cause, evidentiary support, timeline consistency, and completeness of the report.",
    passThreshold: 70,
    requiredEvidenceChecklist: [
      "Police report",
      "Witness statements",
      "Physical evidence log",
      "Bodycam / dashcam footage",
    ],
    aiEnabledByRole: {
      admin: true,
      attorney: true,
      public_defender: true,
      paralegal: true,
      investigator: true,
      viewer: false,
    },
    memoryBankRetrieval: true,
    lawLibraryRetrieval: true,
    maxRetrievedEntries: 5,
    requireCitations: true,
  },
  auto_assign: {
    enabled: true,
    assigningRoles: ["attorney", "public_defender", "paralegal"],
    maxActiveCasesDefault: 15,
    byCaseType: true,
    byPriority: true,
    byAvailability: true,
    byWorkload: true,
    manualOverride: true,
    conflictCheck: true,
  },
  dashboard: {
    cards: Object.fromEntries(DASHBOARD_CARDS.map((c) => [c.key, true])),
  },
  evidence: {
    allowedLinkTypes: ["google_docs", "google_drive", "youtube", "screenshot", "external"],
    requiredSummaryFields: ["summary"],
  },
  timeline: {
    overdueWarningDays: 3,
    courtDateReminderDays: 7,
    requiredEventsByCaseType: {},
  },
  civilian: {
    registrationEnabled: true,
    requestTypes: { civil: true, criminal: true },
    welcomeMessage:
      "Welcome to your informant portal. Submit a request, track your case, and message your legal team securely.",
    statusLabels: {},
    customStatuses: [],
    urgencyLabels: {},
    fieldConfig: {},
    reviewerRoles: ["attorney", "public_defender", "paralegal"],
    defaultAccess: {
      canViewStatus: true,
      canViewCourtDates: true,
      canViewEvidence: false,
      canSendMessages: true,
      canAddEvidence: false,
      canViewDrafts: false,
      canViewAiSummaries: false,
    },
  },
  warrant: {
    customTypes: [],
    statusLabels: {},
    submitterRoles: ["law_enforcement"],
    reviewerRoles: ["judge"],
    approverRoles: ["judge"],
    closerRoles: ["law_enforcement", "state_attorney", "prosecutor"],
    requiredFields: [
      "title",
      "warrantType",
      "suspectName",
      "agency",
      "requestedCharges",
      "probableCause",
      "incidentSummary",
      "location",
    ],
    requiredCloseoutFields: ["served"],
    scoringThresholds: { pass: 75, highRisk: 40 },
    autoCreateProsecutionCase: true,
    autoCreateDefenseCase: true,
    notifyOfficerOnDecision: true,
    notifyStateAttorneyOnApproval: true,
    notifyDefenseOnContest: true,
    notificationSounds: false,
  },
  motion: {
    customTypes: [],
    statusLabels: {},
    reviewerRoles: ["judge"],
    rulerRoles: ["judge"],
    requiredFields: ["title", "motionType", "relief", "argument"],
    scoringThresholds: { pass: 70, weak: 40 },
    notifyOpposingOnFiling: true,
    notifyFilerOnRuling: true,
    notifyJudgeOnFiling: true,
  },
  notification: {
    soundsEnabled: true,
    roleSoundEnabled: {},
    defaultSoundType: "chime",
    defaultVolume: 70,
  },
  prosecution: {
    sections: {
      overview: true,
      charges: true,
      courtDates: true,
      evidence: true,
      policeReports: true,
      warrants: true,
      motions: true,
      timeline: true,
      lawLibrary: true,
      status: true,
      rulings: true,
    },
    canViewDefenseNotes: false,
    canViewDefenseAi: false,
    canViewCivilianRecords: false,
    separateNotes: true,
    shareEvidenceByDefault: true,
  },
}

/** Load one settings group merged over its defaults. */
export async function getSettings<K extends SettingsKey>(
  key: K,
): Promise<SettingsMap[K]> {
  const all = await getAllSettings()
  return all[key]
}

/** Load every settings group at once (merged over defaults). */
export const getAllSettings = cache(async (): Promise<SettingsMap> => {
  let storedByKey: Record<string, unknown> = {}
  try {
    const rows = await db.select().from(appSettings)
    storedByKey = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  } catch {
    storedByKey = {}
  }
  const keys = Object.keys(DEFAULT_SETTINGS) as SettingsKey[]
  const out = {} as SettingsMap
  for (const k of keys) {
    const stored = (storedByKey[k] as Record<string, unknown>) ?? {}
    // @ts-expect-error index assignment across the union is safe here
    out[k] = { ...DEFAULT_SETTINGS[k], ...stored }
  }
  return out
})
