export type Role =
  | "admin"
  | "mcd_command"
  | "supervisor"
  | "detective"
  | "investigator"
  | "marked_unit"
  | "crime_analyst"
  | "evidence_tech"
  | "liaison"
  | "confidential_informant"
  | "read_only"
  | "prosecutor"
  | "judge"
  // legacy keys kept so existing database rows and routes do not break
  | "attorney"
  | "public_defender"
  | "paralegal"
  | "viewer"
  | "civilian"
  | "law_enforcement"
  | "state_attorney"

export const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "admin", label: "Super Admin", description: "Full access. Manages the platform, roles, users, settings, and audit controls." },
  { value: "mcd_command", label: "MCD Command", description: "Command-level case oversight, approvals, analytics, and sensitive investigation access." },
  { value: "supervisor", label: "Supervisor", description: "Reviews investigations, approvals, assignments, and case readiness." },
  { value: "detective", label: "Detective", description: "Builds and manages major investigations from intake through prosecution." },
  { value: "investigator", label: "Investigator", description: "Gathers field information, evidence, witness statements, and intelligence." },
  { value: "marked_unit", label: "Marked Unit", description: "Submits incident reports, supplements, warrant requests, and evidence links." },
  { value: "crime_analyst", label: "Crime Analyst", description: "Links persons, vehicles, cases, gangs, trends, and intelligence reports." },
  { value: "evidence_tech", label: "Evidence Technician", description: "Manages evidence records, chain of custody, lab status, and digital evidence links." },
  { value: "liaison", label: "Liaison", description: "Coordinates outside agency, patrol, prosecutor, court, and community submissions." },
  { value: "confidential_informant", label: "Confidential Informant", description: "Restricted external access for submitting tips and supporting information." },
  { value: "read_only", label: "Read Only", description: "Read-only access to approved investigation information." },
  { value: "prosecutor", label: "Prosecutor", description: "Reviews court-ready cases, charging packets, warrants, and evidence." },
  { value: "judge", label: "Judge", description: "Reviews warrants, motions, court packets, and judicial queues." },
  { value: "attorney", label: "Detective", description: "Legacy role mapped to detective access." },
  { value: "public_defender", label: "Supervisor", description: "Legacy role mapped to supervisor access." },
  { value: "paralegal", label: "Crime Analyst", description: "Legacy role mapped to analyst support access." },
  { value: "viewer", label: "Read Only", description: "Legacy role mapped to read-only access." },
  { value: "civilian", label: "Confidential Informant", description: "Legacy external portal role." },
  { value: "law_enforcement", label: "Marked Unit", description: "Legacy law-enforcement report submission role." },
  { value: "state_attorney", label: "State Attorney", description: "Legacy prosecution role." },
]

/** Staff roles used for assignment pickers and the main MCD workspace. */
export const STAFF_ROLES: Role[] = [
  "admin",
  "mcd_command",
  "supervisor",
  "detective",
  "investigator",
  "marked_unit",
  "crime_analyst",
  "evidence_tech",
  "liaison",
  "read_only",
  "attorney",
  "public_defender",
  "paralegal",
  "viewer",
]

/** Roles that use the patrol / marked-unit report interface. */
export const LE_ROLES: Role[] = ["marked_unit", "law_enforcement"]

/** Roles that use the shared Prosecution interface. */
export const PROSECUTION_ROLES: Role[] = ["state_attorney", "prosecutor"]

/** Roles that use the Judge interface. */
export const JUDGE_ROLES: Role[] = ["judge"]

export const ROLE_LABELS: Record<Role, string> = Object.fromEntries(
  ROLES.map((r) => [r.value, r.label]),
) as Record<Role, string>

/** Roles that can be assigned as lead detective / lead investigator on a case. */
export const COUNSEL_ROLES: Role[] = ["mcd_command", "supervisor", "detective", "investigator", "attorney", "public_defender"]

// --- Interfaces -------------------------------------------------------------
export type AppInterface = "app" | "portal" | "le" | "prosecution" | "judge"

export interface InterfaceDef {
  id: AppInterface
  label: string
  description: string
  homePath: string
  roles: Role[]
}

export const APP_INTERFACES: InterfaceDef[] = [
  {
    id: "app",
    label: "MCD Workspace",
    description: "Investigations, evidence, intelligence, warrants, reports, and MCD AI tools.",
    homePath: "/dashboard",
    roles: STAFF_ROLES,
  },
  {
    id: "portal",
    label: "Informant Portal",
    description: "Restricted external portal for tips, updates, and supporting information.",
    homePath: "/portal",
    roles: ["civilian", "confidential_informant"],
  },
  {
    id: "le",
    label: "Marked Unit",
    description: "Submit reports, evidence links, supplements, and warrant requests.",
    homePath: "/le/reports",
    roles: LE_ROLES,
  },
  {
    id: "prosecution",
    label: "Prosecution",
    description: "Review submitted investigations and manage prosecution-ready cases.",
    homePath: "/prosecution/review",
    roles: PROSECUTION_ROLES,
  },
  {
    id: "judge",
    label: "Judge",
    description: "Review warrants, motions, court packets, and judicial queues.",
    homePath: "/judge/queue",
    roles: JUDGE_ROLES,
  },
]

export const APP_INTERFACE_IDS: AppInterface[] = APP_INTERFACES.map((i) => i.id)

export const INTERFACE_LABELS: Record<AppInterface, string> = Object.fromEntries(
  APP_INTERFACES.map((i) => [i.id, i.label]),
) as Record<AppInterface, string>

export function interfaceForRole(role: Role): AppInterface {
  if (role === "civilian" || role === "confidential_informant") return "portal"
  if (LE_ROLES.includes(role)) return "le"
  if (PROSECUTION_ROLES.includes(role)) return "prosecution"
  if (JUDGE_ROLES.includes(role)) return "judge"
  return "app"
}

export function interfacesForRoles(roles: (Role | string)[]): AppInterface[] {
  const set = new Set<AppInterface>()
  for (const r of roles) set.add(interfaceForRole(r as Role))
  return APP_INTERFACE_IDS.filter((id) => set.has(id))
}

export function homePathForInterface(id: AppInterface): string {
  return APP_INTERFACES.find((i) => i.id === id)?.homePath ?? "/dashboard"
}

export function computeAllowedInterfaces(input: {
  roles: (Role | string)[]
  adminAccess: boolean
  allowedInterfaces: string[] | null | undefined
}): AppInterface[] {
  const base = input.adminAccess
    ? [...APP_INTERFACE_IDS]
    : interfacesForRoles(input.roles)
  if (!input.allowedInterfaces) return base
  return base.filter((id) => input.allowedInterfaces!.includes(id))
}

// --- Permissions ------------------------------------------------------------
export type Permission =
  | "case:view"
  | "case:create"
  | "case:edit"
  | "case:delete"
  | "case:assign"
  | "data:export"
  | "ai:use"
  | "evidence:manage"
  | "timeline:manage"
  | "plan:manage"
  | "draft:manage"
  | "team:manage"
  | "admin:access"
  | "intake:review"
  | "intake:convert"
  | "law-library:view"
  | "law-library:create"
  | "law-library:edit"
  | "law-library:approve"
  | "law-library:archive"
  | "law-library:delete"
  | "report:submit"
  | "report:review"
  | "report:convert"
  | "report:view-all"
  | "evidence:add-report"
  | "prosecution:view"
  | "prosecution:manage"
  | "prosecution:ai"
  | "evidence:request"
  | "warrant:submit"
  | "warrant:review"
  | "warrant:approve"
  | "warrant:close"
  | "warrant:view-all"
  | "warrant:ai"
  | "motion:file"
  | "motion:respond"
  | "motion:review"
  | "motion:rule"
  | "motion:view-all"
  | "motion:ai"
  | "judge:case-authority"
  | "memory:manage"

export const ALL_PERMISSIONS: Permission[] = [
  "case:view",
  "case:create",
  "case:edit",
  "case:delete",
  "case:assign",
  "data:export",
  "ai:use",
  "evidence:manage",
  "timeline:manage",
  "plan:manage",
  "draft:manage",
  "team:manage",
  "admin:access",
  "intake:review",
  "intake:convert",
  "law-library:view",
  "law-library:create",
  "law-library:edit",
  "law-library:approve",
  "law-library:archive",
  "law-library:delete",
  "report:submit",
  "report:review",
  "report:convert",
  "report:view-all",
  "evidence:add-report",
  "prosecution:view",
  "prosecution:manage",
  "prosecution:ai",
  "evidence:request",
  "warrant:submit",
  "warrant:review",
  "warrant:approve",
  "warrant:close",
  "warrant:view-all",
  "warrant:ai",
  "motion:file",
  "motion:respond",
  "motion:review",
  "motion:rule",
  "motion:view-all",
  "motion:ai",
  "judge:case-authority",
  "memory:manage",
]

/** Kept for compatibility with existing imports. */
const ALL: Permission[] = ALL_PERMISSIONS

export const PERMISSION_LABELS: Record<Permission, string> = {
  "case:view": "View cases",
  "case:create": "Create cases",
  "case:edit": "Edit cases",
  "case:delete": "Delete cases",
  "case:assign": "Assign / reassign cases",
  "data:export": "Export data",
  "ai:use": "Analyze with AI",
  "evidence:manage": "Manage evidence",
  "timeline:manage": "Manage timeline",
  "plan:manage": "Manage case plan",
  "draft:manage": "Manage drafts & motions",
  "team:manage": "Manage team members",
  "admin:access": "Access the admin panel",
  "intake:review": "Review client intake requests",
  "intake:convert": "Convert intake requests to cases",
  "law-library:view": "View law library",
  "law-library:create": "Create law library entries",
  "law-library:edit": "Edit law library entries",
  "law-library:approve": "Approve law library entries",
  "law-library:archive": "Archive law library entries",
  "law-library:delete": "Delete law library entries",
  "report:submit": "Submit incident reports",
  "report:review": "Review submitted reports",
  "report:convert": "Convert reports to prosecution cases",
  "report:view-all": "View all police reports",
  "evidence:add-report": "Add police reports to a case evidence locker",
  "prosecution:view": "View prosecution cases",
  "prosecution:manage": "Manage prosecution cases",
  "prosecution:ai": "Analyze prosecution cases with AI",
  "evidence:request": "Request evidence from law enforcement",
  "warrant:submit": "Create and submit warrant requests",
  "warrant:review": "Review warrants and request more information",
  "warrant:approve": "Approve, deny, and decide warrants",
  "warrant:close": "Close out warrants",
  "warrant:view-all": "View the warrant list and details",
  "warrant:ai": "Use the warrant AI assistant",
  "motion:file": "File and submit motions",
  "motion:respond": "Respond to an opposing party's motion",
  "motion:review": "Review motions and request more information",
  "motion:rule": "Rule on motions (grant, deny, etc.)",
  "motion:view-all": "View the motion list and details",
  "motion:ai": "Use the motion AI assistant",
  "judge:case-authority": "Exercise full judicial authority over cases",
  "memory:manage": "Manage the AI Memory Bank",
}

export const PERMISSION_GROUPS = [
  { id: "cases", label: "Cases", permissions: ["case:view", "case:create", "case:edit", "case:delete", "case:assign"] },
  { id: "work", label: "Case Work", permissions: ["evidence:manage", "timeline:manage", "plan:manage", "draft:manage"] },
  { id: "ai", label: "Artificial Intelligence", permissions: ["ai:use"] },
  { id: "data", label: "Data", permissions: ["data:export"] },
  { id: "intake", label: "Informant Tips", permissions: ["intake:review", "intake:convert"] },
  { id: "law-library", label: "Penal Code / SOP Bank", permissions: ["law-library:view", "law-library:create", "law-library:edit", "law-library:approve", "law-library:archive", "law-library:delete"] },
  { id: "law-enforcement", label: "Law Enforcement", permissions: ["report:submit"] },
  { id: "police-reports", label: "Police Reports", permissions: ["report:view-all", "evidence:add-report"] },
  { id: "prosecution", label: "Prosecution", permissions: ["report:review", "report:convert", "prosecution:view", "prosecution:manage", "prosecution:ai", "evidence:request"] },
  { id: "warrants", label: "Warrants", permissions: ["warrant:submit", "warrant:review", "warrant:approve", "warrant:close", "warrant:view-all", "warrant:ai"] },
  { id: "motions", label: "Motions", permissions: ["motion:file", "motion:respond", "motion:review", "motion:rule", "motion:view-all", "motion:ai"] },
  { id: "judicial", label: "Judicial Authority", permissions: ["judge:case-authority"] },
  { id: "admin", label: "Administration", permissions: ["team:manage", "admin:access", "memory:manage"] },
]

/**
 * Built-in default permissions per role. These seed the database `roles` table
 * and serve as a safety fallback if a role is missing from the DB.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ALL,
  mcd_command: ALL,
  supervisor: [
    "case:view", "case:create", "case:edit", "case:assign", "data:export", "ai:use",
    "evidence:manage", "timeline:manage", "plan:manage", "draft:manage", "team:manage",
    "intake:review", "intake:convert", "law-library:view", "law-library:create", "law-library:edit", "law-library:approve",
    "report:view-all", "report:review", "evidence:add-report", "warrant:submit", "warrant:review", "warrant:close", "warrant:view-all", "warrant:ai",
    "motion:file", "motion:respond", "motion:view-all", "motion:ai", "memory:manage",
  ],
  detective: [
    "case:view", "case:create", "case:edit", "case:assign", "data:export", "ai:use",
    "evidence:manage", "timeline:manage", "plan:manage", "draft:manage", "intake:review", "intake:convert",
    "law-library:view", "report:view-all", "evidence:add-report", "warrant:submit", "warrant:close", "warrant:view-all", "warrant:ai",
    "motion:file", "motion:respond", "motion:view-all", "motion:ai",
  ],
  investigator: [
    "case:view", "case:create", "case:edit", "ai:use", "evidence:manage", "timeline:manage", "plan:manage",
    "law-library:view", "report:view-all", "evidence:add-report", "warrant:submit", "warrant:view-all", "warrant:ai",
  ],
  marked_unit: ["report:submit", "law-library:view", "warrant:submit", "warrant:close", "warrant:view-all", "warrant:ai", "case:view"],
  crime_analyst: ["case:view", "case:create", "case:edit", "ai:use", "evidence:manage", "timeline:manage", "plan:manage", "law-library:view", "report:view-all", "data:export"],
  evidence_tech: ["case:view", "case:edit", "evidence:manage", "timeline:manage", "report:view-all", "evidence:add-report", "data:export"],
  liaison: ["case:view", "case:create", "case:edit", "intake:review", "intake:convert", "report:view-all", "law-library:view", "warrant:view-all"],
  confidential_informant: [],
  read_only: ["case:view", "law-library:view", "warrant:view-all", "motion:view-all"],
  attorney: [
    "case:view", "case:create", "case:edit", "case:assign", "data:export", "ai:use", "evidence:manage", "timeline:manage", "plan:manage", "draft:manage",
    "intake:review", "intake:convert", "law-library:view", "report:view-all", "evidence:add-report", "warrant:view-all", "warrant:ai", "motion:file", "motion:respond", "motion:view-all", "motion:ai",
  ],
  public_defender: [
    "case:view", "case:create", "case:edit", "case:assign", "data:export", "ai:use", "evidence:manage", "timeline:manage", "plan:manage", "draft:manage",
    "intake:review", "intake:convert", "law-library:view", "report:view-all", "evidence:add-report", "warrant:view-all", "warrant:ai", "motion:file", "motion:respond", "motion:view-all", "motion:ai",
  ],
  paralegal: ["case:view", "case:edit", "ai:use", "evidence:manage", "timeline:manage", "plan:manage", "draft:manage", "intake:review", "law-library:view", "report:view-all", "evidence:add-report", "warrant:view-all", "motion:file", "motion:view-all"],
  viewer: ["case:view"],
  civilian: [],
  law_enforcement: ["report:submit", "law-library:view", "warrant:submit", "warrant:close", "warrant:view-all", "warrant:ai"],
  state_attorney: ["report:review", "report:convert", "report:view-all", "evidence:add-report", "prosecution:view", "prosecution:manage", "prosecution:ai", "evidence:request", "law-library:view", "warrant:close", "warrant:view-all", "warrant:ai", "motion:file", "motion:respond", "motion:view-all", "motion:ai"],
  prosecutor: ["report:review", "report:convert", "report:view-all", "evidence:add-report", "prosecution:view", "prosecution:manage", "prosecution:ai", "evidence:request", "law-library:view", "warrant:close", "warrant:view-all", "warrant:ai", "motion:file", "motion:respond", "motion:view-all", "motion:ai"],
  judge: ["case:view", "warrant:review", "warrant:approve", "warrant:view-all", "warrant:ai", "motion:review", "motion:rule", "motion:view-all", "motion:ai", "judge:case-authority", "law-library:view"],
}

/**
 * Synchronous permission check against the BUILT-IN defaults. The database is
 * the source of truth at runtime (see lib/permissions.ts and the `permissions`
 * array on the current user); this remains as a fallback for code paths that
 * only have a role string and for seeding.
 */
export function can(
  role: Role | string | undefined | null,
  permission: Permission,
): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role as Role]?.includes(permission) ?? false
}

/** Check a permission against an explicit permission list (DB-driven). */
export function hasPerm(
  permissions: string[] | undefined | null,
  permission: Permission,
): boolean {
  return permissions?.includes(permission) ?? false
}

// --- Case enums -------------------------------------------------------------
export const CASE_TYPES = [
  { value: "homicide", label: "Homicide" },
  { value: "robbery", label: "Robbery" },
  { value: "shooting", label: "Shooting" },
  { value: "gang", label: "Gang Investigation" },
  { value: "narcotics", label: "Drug / Narcotics" },
  { value: "organized_crime", label: "Organized Crime" },
  { value: "cold_case", label: "Cold Case" },
  { value: "other", label: "Other Major Crime" },
] as const

export const CASE_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const

export const CASE_STATUSES = [
  { value: "active", label: "Active" },
  { value: "pending_review", label: "Pending Supervisor Review" },
  { value: "prosecution_ready", label: "Prosecution Ready" },
  { value: "cold_case", label: "Cold Case" },
  { value: "cleared", label: "Cleared" },
  { value: "closed", label: "Closed" },
] as const

export const EVIDENCE_TYPES = [
  { value: "document", label: "Document" },
  { value: "photo", label: "Photo" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "bodycam", label: "Bodycam" },
  { value: "dashcam", label: "Dashcam" },
  { value: "cctv", label: "CCTV" },
  { value: "phone_extraction", label: "Phone Extraction" },
  { value: "dna", label: "DNA" },
  { value: "fingerprint", label: "Fingerprint" },
  { value: "ballistics", label: "Ballistics" },
  { value: "lab_report", label: "Lab Report" },
  { value: "witness_statement", label: "Witness Statement" },
  { value: "physical", label: "Physical Evidence" },
  { value: "other", label: "Other" },
] as const

export const EVIDENCE_STATUSES = [
  { value: "pending_review", label: "Pending Review" },
  { value: "reviewed", label: "Reviewed" },
  { value: "key_evidence", label: "Key Evidence" },
  { value: "disputed", label: "Disputed" },
] as const

export const TIMELINE_EVENT_TYPES = [
  { value: "incident", label: "Incident" },
  { value: "arrest", label: "Arrest" },
  { value: "filing", label: "Filing" },
  { value: "hearing", label: "Hearing" },
  { value: "deadline", label: "Deadline" },
  { value: "custom", label: "Custom" },
] as const

export const PLAN_CATEGORIES = [
  { value: "next_step", label: "Next Step" },
  { value: "motion", label: "Motion" },
  { value: "discovery", label: "Discovery" },
  { value: "investigation", label: "Investigation" },
  { value: "deadline", label: "Deadline" },
] as const

export const PLAN_STATUSES = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
] as const

export const DRAFT_TYPES = [
  { value: "motion", label: "Motion" },
  { value: "strategy_memo", label: "Strategy Memo" },
  { value: "discovery_request", label: "Discovery Request" },
  { value: "brief", label: "Legal Brief" },
  { value: "letter", label: "Client Letter" },
] as const

export const SPECIALTIES = [
  "Criminal Defense",
  "DUI / Traffic",
  "Drug Offenses",
  "Violent Crimes",
  "White Collar",
  "Family Law",
  "Civil Litigation",
  "Appeals",
  "Juvenile",
  "Domestic Violence",
] as const

export const CHARGE_CATEGORIES = [
  { value: "felony", label: "Felony" },
  { value: "misdemeanor", label: "Misdemeanor" },
  { value: "infraction", label: "Infraction" },
  { value: "violent", label: "Violent Crime" },
  { value: "drug", label: "Drug Offense" },
  { value: "property", label: "Property Crime" },
  { value: "dui", label: "DUI / Traffic" },
  { value: "white_collar", label: "White Collar" },
] as const

export const COURT_TYPES = [
  { value: "municipal", label: "Municipal Court" },
  { value: "district", label: "District Court" },
  { value: "superior", label: "Superior Court" },
  { value: "federal", label: "Federal Court" },
  { value: "appellate", label: "Appellate Court" },
  { value: "supreme", label: "Supreme Court" },
] as const

export const DEADLINE_TYPES = [
  { value: "filing", label: "Filing Deadline" },
  { value: "discovery", label: "Discovery Deadline" },
  { value: "motion", label: "Motion Deadline" },
  { value: "response", label: "Response Due" },
  { value: "court_date", label: "Court Date" },
  { value: "statute", label: "Statute of Limitations" },
] as const

export const EVIDENCE_LINK_TYPES = [
  { value: "google_docs", label: "Google Docs" },
  { value: "google_drive", label: "Google Drive" },
  { value: "youtube", label: "YouTube / Bodycam" },
  { value: "screenshot", label: "Screenshot" },
  { value: "external", label: "External Link" },
] as const

export const EVIDENCE_TAGS = [
  { value: "police_report", label: "Police Report" },
  { value: "bodycam", label: "Bodycam" },
  { value: "dashcam", label: "Dashcam" },
  { value: "witness", label: "Witness" },
  { value: "forensic", label: "Forensic" },
  { value: "exculpatory", label: "Exculpatory" },
  { value: "stop", label: "Traffic Stop" },
] as const

// --- Memory Bank -------------------------------------------------------------

/** Categories specific to internal operational knowledge (vs. legal authorities). */
export const MEMORY_CATEGORIES = [
  { value: "sop", label: "Standard Operating Procedure" },
  { value: "policy", label: "Policy" },
  { value: "training", label: "Training Material" },
  { value: "playbook", label: "Playbook / Strategy" },
  { value: "reference", label: "Reference / FAQ" },
  { value: "ai_knowledge", label: "Custom AI Knowledge" },
] as const

// --- Warrants ---------------------------------------------------------------

export const WARRANT_TYPES = [
  { value: "arrest", label: "Arrest Warrant" },
  { value: "search", label: "Search Warrant" },
  { value: "bench", label: "Bench Warrant" },
  { value: "other", label: "Other" },
] as const

export const WARRANT_RISK_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "severe", label: "Severe" },
] as const

/**
 * Canonical warrant lifecycle statuses. These values drive workflow logic and
 * must always exist; admins may relabel them via settings.
 */
export const WARRANT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "needs_more_info", label: "Needs More Info" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "not_active", label: "Not Active" },
  { value: "warrant_returned", label: "Warrant Returned" },
  { value: "closed", label: "Closed" },
] as const

/** Tailwind badge classes for each warrant status. */
export const WARRANT_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  needs_more_info: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
  not_active: "bg-gray-200 text-gray-700",
  warrant_returned: "bg-indigo-100 text-indigo-800",
  closed: "bg-purple-100 text-purple-800",
}

// --- Motions -----------------------------------------------------------------

export const MOTION_TYPES = [
  { value: "suppress", label: "Motion to Suppress" },
  { value: "dismiss", label: "Motion to Dismiss" },
  { value: "continuance", label: "Motion for Continuance" },
  { value: "discovery", label: "Discovery Motion" },
  { value: "bail", label: "Bail / Bond Motion" },
  { value: "in_limine", label: "Motion in Limine" },
  { value: "other", label: "Other" },
] as const

export const MOTION_FILING_SIDES = [
  { value: "defense", label: "Defense" },
  { value: "prosecution", label: "Prosecution" },
] as const

export const MOTION_URGENCY_LEVELS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "emergency", label: "Emergency" },
] as const

/**
 * Canonical motion lifecycle statuses. These values drive workflow logic and
 * must always exist; admins may relabel them via settings.
 */
export const MOTION_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Filed" },
  { value: "under_review", label: "Under Review" },
  { value: "needs_more_info", label: "Needs More Info" },
  { value: "granted", label: "Granted" },
  { value: "granted_in_part", label: "Granted in Part" },
  { value: "denied", label: "Denied" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "closed", label: "Closed" },
] as const

/** Tailwind badge classes for each motion status. */
export const MOTION_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  needs_more_info: "bg-orange-100 text-orange-800",
  granted: "bg-green-100 text-green-800",
  granted_in_part: "bg-teal-100 text-teal-800",
  denied: "bg-red-100 text-red-800",
  withdrawn: "bg-gray-200 text-gray-700",
  closed: "bg-purple-100 text-purple-800",
}

export const TIMELINE_EVENT_CATEGORIES = [
  { value: "procedural", label: "Procedural" },
  { value: "investigative", label: "Investigative" },
  { value: "court", label: "Court" },
  { value: "client", label: "Client Contact" },
  { value: "deadline", label: "Deadline" },
] as const

/**
 * Registry of every configurable option list. The Case/Evidence/Timeline
 * settings admin pages and the DB-driven options provider both build off this.
 * `key` is the camelCase identifier used by the options provider; `category`
 * is the value stored in the `case_options.category` column.
 */
export interface OptionCategoryDef {
  key: string
  category: string
  label: string
  description: string
  defaults: readonly { value: string; label: string }[]
}

export const OPTION_CATEGORIES: OptionCategoryDef[] = [
  { key: "caseTypes", category: "case_type", label: "Case Types", description: "Practice areas a case can belong to.", defaults: CASE_TYPES },
  { key: "caseStatuses", category: "case_status", label: "Case Statuses", description: "Lifecycle stages for a case.", defaults: CASE_STATUSES },
  { key: "casePriorities", category: "case_priority", label: "Case Priorities", description: "Urgency levels for triage and assignment.", defaults: CASE_PRIORITIES },
  { key: "chargeCategories", category: "charge_category", label: "Charge Categories", description: "Classifications for charges on a case.", defaults: CHARGE_CATEGORIES },
  { key: "courtTypes", category: "court_type", label: "Court Types", description: "Courts where matters are heard.", defaults: COURT_TYPES },
  { key: "deadlineTypes", category: "deadline_type", label: "Deadline Types", description: "Types of filing deadlines and key dates.", defaults: DEADLINE_TYPES },
  { key: "timelineEventTypes", category: "timeline_event_type", label: "Timeline Event Types", description: "Event types shown on the case timeline.", defaults: TIMELINE_EVENT_TYPES },
  { key: "timelineEventCategories", category: "timeline_event_category", label: "Timeline Event Categories", description: "Higher-level grouping for timeline events.", defaults: TIMELINE_EVENT_CATEGORIES },
  { key: "evidenceTypes", category: "evidence_type", label: "Evidence Types", description: "Kinds of evidence that can be attached.", defaults: EVIDENCE_TYPES },
  { key: "evidenceStatuses", category: "evidence_status", label: "Evidence Statuses", description: "Review states for a piece of evidence.", defaults: EVIDENCE_STATUSES },
  { key: "evidenceLinkTypes", category: "evidence_link_type", label: "Evidence Link Types", description: "Allowed external link sources for evidence.", defaults: EVIDENCE_LINK_TYPES },
  { key: "evidenceTags", category: "evidence_tag", label: "Evidence Tag Presets", description: "Suggested tags for organizing evidence.", defaults: EVIDENCE_TAGS },
  { key: "planCategories", category: "plan_category", label: "Plan Categories", description: "Categories for case plan items.", defaults: PLAN_CATEGORIES },
  { key: "draftTypes", category: "draft_type", label: "Draft Types", description: "Document types for drafts.", defaults: DRAFT_TYPES },
]

export function labelOf<T extends { value: string; label: string }>(
  list: readonly T[],
  value: string,
): string {
  return list.find((x) => x.value === value)?.label ?? value
}

/**
 * Convert a constants list into the `items` map base-ui Select uses to
 * resolve the displayed label for the current value.
 */
export function itemsOf<T extends { value: string; label: string }>(
  list: readonly T[],
): Record<string, string> {
  return Object.fromEntries(list.map((x) => [x.value, x.label]))
}

// --- Civilian intake --------------------------------------------------------

export const INTAKE_TYPES = [
  { value: "civil", label: "Civil Lawsuit" },
  { value: "criminal", label: "Contest a Criminal Charge" },
] as const

/** Default intake workflow statuses. Admins may customize labels/extras, but
 * these canonical values drive workflow logic and must always exist. */
export const INTAKE_STATUSES = [
  { value: "new", label: "New" },
  { value: "under_review", label: "Under Review" },
  { value: "needs_info", label: "Needs More Info" },
  { value: "accepted", label: "Accepted" },
  { value: "converted_to_case", label: "Converted to Case" },
  { value: "declined", label: "Declined" },
] as const

/** Statuses that are terminal / managed by the system, not freely editable. */
export const INTAKE_TERMINAL_STATUSES = ["converted_to_case"]

export const INTAKE_URGENCY_LEVELS = [
  { value: "low", label: "Low — no upcoming deadlines" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High — deadline within weeks" },
  { value: "urgent", label: "Urgent — deadline within days" },
] as const

export const INTAKE_EVIDENCE_TYPES = [
  { value: "google_docs", label: "Google Docs" },
  { value: "google_drive", label: "Google Drive" },
  { value: "youtube", label: "Video (YouTube / Drive)" },
  { value: "photo", label: "Photo / Screenshot" },
  { value: "external", label: "External Link" },
] as const

export interface IntakeFieldDef {
  key: string
  label: string
  /** input control to render */
  kind: "text" | "textarea" | "date" | "select" | "tel" | "email"
  placeholder?: string
  help?: string
  options?: readonly { value: string; label: string }[]
  /** default enabled/required; admins can override via settings. */
  defaultEnabled: boolean
  defaultRequired: boolean
  /** if true, always shown and cannot be disabled (core identity fields). */
  locked?: boolean
}

/** Shared contact fields shown on every intake form. */
export const INTAKE_CONTACT_FIELDS: IntakeFieldDef[] = [
  { key: "fullName", label: "Full Legal Name", kind: "text", defaultEnabled: true, defaultRequired: true, locked: true },
  { key: "email", label: "Email Address", kind: "email", defaultEnabled: true, defaultRequired: true, locked: true },
  { key: "phone", label: "Phone Number", kind: "tel", defaultEnabled: true, defaultRequired: false },
  { key: "preferredContact", label: "Preferred Contact Method", kind: "select", defaultEnabled: true, defaultRequired: false, options: [
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "text", label: "Text Message" },
  ] },
]

export const INTAKE_CIVIL_FIELDS: IntakeFieldDef[] = [
  { key: "subject", label: "Brief Summary of Your Situation", kind: "text", placeholder: "e.g., Landlord withholding security deposit", defaultEnabled: true, defaultRequired: true, locked: true },
  { key: "disputeType", label: "Type of Dispute", kind: "select", defaultEnabled: true, defaultRequired: true, options: [
    { value: "contract", label: "Contract Dispute" },
    { value: "property", label: "Property / Real Estate" },
    { value: "landlord_tenant", label: "Landlord / Tenant" },
    { value: "personal_injury", label: "Personal Injury" },
    { value: "employment", label: "Employment" },
    { value: "consumer", label: "Consumer / Fraud" },
    { value: "family", label: "Family / Domestic" },
    { value: "other", label: "Other" },
  ] },
  { key: "opposingParty", label: "Who Is the Other Party?", kind: "text", placeholder: "Person, business, or organization", defaultEnabled: true, defaultRequired: false },
  { key: "description", label: "Describe What Happened", kind: "textarea", help: "Include dates, what was promised, and how you were harmed.", defaultEnabled: true, defaultRequired: true },
  { key: "incidentDate", label: "Date the Issue Began", kind: "date", defaultEnabled: true, defaultRequired: false },
  { key: "amountInDispute", label: "Amount of Money Involved (if any)", kind: "text", placeholder: "e.g., $4,500", defaultEnabled: true, defaultRequired: false },
  { key: "desiredOutcome", label: "What Outcome Are You Seeking?", kind: "textarea", defaultEnabled: true, defaultRequired: false },
  { key: "priorLegalAction", label: "Have You Taken Any Legal Action Already?", kind: "textarea", help: "Demand letters, prior attorneys, filed paperwork, etc.", defaultEnabled: true, defaultRequired: false },
  { key: "deadline", label: "Any Known Deadlines?", kind: "text", placeholder: "e.g., Response due March 1", defaultEnabled: true, defaultRequired: false },
]

export const INTAKE_CRIMINAL_FIELDS: IntakeFieldDef[] = [
  { key: "subject", label: "What Are You Charged With?", kind: "text", placeholder: "e.g., DUI, possession, assault", defaultEnabled: true, defaultRequired: true, locked: true },
  { key: "charges", label: "Specific Charges (if known)", kind: "textarea", help: "List each charge and code section if you have it.", defaultEnabled: true, defaultRequired: false },
  { key: "chargeLevel", label: "Charge Level", kind: "select", defaultEnabled: true, defaultRequired: false, options: [
    { value: "felony", label: "Felony" },
    { value: "misdemeanor", label: "Misdemeanor" },
    { value: "infraction", label: "Infraction / Ticket" },
    { value: "unsure", label: "Not Sure" },
  ] },
  { key: "arrestDate", label: "Date of Arrest / Citation", kind: "date", defaultEnabled: true, defaultRequired: false },
  { key: "description", label: "Describe What Happened", kind: "textarea", help: "In your own words. Do not include anything you want kept private from your attorney.", defaultEnabled: true, defaultRequired: true },
  { key: "courtDate", label: "Next Court Date", kind: "date", help: "Critical — please provide if you have one.", defaultEnabled: true, defaultRequired: false },
  { key: "courtLocation", label: "Court Name / Location", kind: "text", defaultEnabled: true, defaultRequired: false },
  { key: "custodyStatus", label: "Are You Currently in Custody?", kind: "select", defaultEnabled: true, defaultRequired: false, options: [
    { value: "released", label: "Released" },
    { value: "bail", label: "Released on Bail / Bond" },
    { value: "in_custody", label: "In Custody" },
  ] },
  { key: "priorRecord", label: "Do You Have Prior Convictions?", kind: "select", defaultEnabled: true, defaultRequired: false, options: [
    { value: "none", label: "None" },
    { value: "some", label: "Yes, some" },
    { value: "prefer_discuss", label: "Prefer to discuss privately" },
  ] },
  { key: "currentAttorney", label: "Do You Currently Have an Attorney?", kind: "select", defaultEnabled: true, defaultRequired: false, options: [
    { value: "no", label: "No" },
    { value: "public_defender", label: "Yes, a public defender" },
    { value: "private", label: "Yes, private counsel" },
  ] },
]

export function intakeFieldsForType(type: string): IntakeFieldDef[] {
  const base = type === "criminal" ? INTAKE_CRIMINAL_FIELDS : INTAKE_CIVIL_FIELDS
  return [...INTAKE_CONTACT_FIELDS, ...base]
}
