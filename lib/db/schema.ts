import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core"

// --- Better Auth required tables (self-hosted, public schema) ---------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

// --- App tables -------------------------------------------------------------
// Shared "office" model: all signed-in members share the case repository.
// Rows are not scoped per user; role-based permissions gate actions in code.

export const profile = pgTable("profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().unique(),
  // Primary/default role. Roles assigned to a user live in `userRoles`; this
  // column holds the user's primary role for defaults and backwards compat.
  role: text("role").notNull().default("viewer"),
  title: text("title"),
  activeCaseCount: integer("activeCaseCount").notNull().default(0),
  available: boolean("available").notNull().default(true),
  specialties: text("specialties").array().notNull().default([]),
  disabled: boolean("disabled").notNull().default(false),
  maxActiveCases: integer("maxActiveCases"),
  // Admin override: explicit list of interface ids this user may access.
  // When null, access is derived purely from the user's roles.
  allowedInterfaces: text("allowedInterfaces").array(),
  // The interface the user last viewed, used to restore context on login.
  lastInterface: text("lastInterface"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/** Many-to-many: roles assigned to a user. A user may hold multiple roles. */
export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull(),
  roleKey: text("roleKey").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Admin Panel tables -----------------------------------------------------

/** Custom roles/titles. Permissions are DB-driven and enforced everywhere. */
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  description: text("description"),
  permissions: text("permissions").array().notNull().default([]),
  isSystem: boolean("is_system").notNull().default(false),
  isCounsel: boolean("is_counsel").notNull().default(false),
  adminAccess: boolean("admin_access").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

/** Configurable enum lists that drive dropdowns across the whole app. */
export const caseOptions = pgTable("case_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

/** Grouped key/value JSON settings (system, security, ai, auto_assign, etc). */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().default({}),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"),
})

/** Reusable motion / draft document templates. */
export const motionTemplates = pgTable("motion_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key"),
  name: text("name").notNull(),
  category: text("category").notNull().default("motion"),
  description: text("description"),
  content: text("content").notNull().default(""),
  isSystem: boolean("is_system").notNull().default(false),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

/** Admin-only audit trail of sensitive actions. */
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: text("actor_id"),
  actorName: text("actor_name"),
  action: text("action").notNull(),
  category: text("category").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  summary: text("summary").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const cases = pgTable("cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  caseNumber: text("caseNumber").notNull(),
  clientName: text("clientName").notNull(),
  charges: text("charges"),
  caseType: text("caseType").notNull().default("criminal"),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("intake"),
  // "defense" (default) or "prosecution" — which side of the matter this case belongs to.
  side: text("side").notNull().default("defense"),
  // For prosecution cases converted from a law enforcement report.
  sourceReportId: uuid("sourceReportId"),
  defendantName: text("defendantName"),
  arrestingAgency: text("arrestingAgency"),
  leadOfficerId: text("leadOfficerId"),
  probableCause: text("probableCause"),
  incidentNarrative: text("incidentNarrative"),
  // MCD investigation fields. Existing legal fields remain for backwards compatibility.
  incidentType: text("incidentType"),
  leadDetectiveId: text("leadDetectiveId"),
  assignedUnit: text("assignedUnit"),
  suspects: jsonb("suspects").notNull().default([]),
  victims: jsonb("victims").notNull().default([]),
  witnesses: jsonb("witnesses").notNull().default([]),
  clearanceStatus: text("clearanceStatus").notNull().default("open"),
  supervisorApprovalStatus: text("supervisorApprovalStatus").notNull().default("pending"),
  linkedInvestigations: text("linkedInvestigations").array().notNull().default([]),
  relatedReports: text("relatedReports").array().notNull().default([]),
  investigationChecklist: jsonb("investigationChecklist").notNull().default([]),
  assignedAttorneyId: text("assignedAttorneyId"),
  assignedParalegalId: text("assignedParalegalId"),
  courtDate: timestamp("courtDate"),
  notes: text("notes"),
  strategySummary: text("strategySummary"),
  conflictFlag: boolean("conflictFlag").notNull().default(false),
  // Client-initiated closure request, pending staff approval.
  closureRequested: boolean("closureRequested").notNull().default(false),
  closureRequestedAt: timestamp("closureRequestedAt"),
  closureRequestedById: text("closureRequestedById"),
  closureReason: text("closureReason"),
  // Timestamp the case was actually marked closed by staff.
  closedAt: timestamp("closedAt"),
  createdById: text("createdById").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const filingDeadlines = pgTable("filing_deadlines", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId").notNull(),
  label: text("label").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const timelineEvents = pgTable("timeline_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId").notNull(),
  date: timestamp("date").notNull(),
  title: text("title").notNull(),
  eventType: text("eventType").notNull().default("custom"),
  description: text("description"),
  responsibleUserId: text("responsibleUserId"),
  deadlineStatus: text("deadlineStatus").notNull().default("pending"),
  relatedEvidenceId: uuid("relatedEvidenceId"),
  relatedTask: text("relatedTask"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const evidence = pgTable("evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId").notNull(),
  title: text("title").notNull(),
  evidenceType: text("evidenceType").notNull().default("document"),
  link: text("link"),
  description: text("description"),
  summary: text("summary"),
  tags: text("tags").array().notNull().default([]),
  status: text("status").notNull().default("pending_review"),
  relatedTimelineEventId: uuid("relatedTimelineEventId"),
  relatedCharge: text("relatedCharge"),
  addedById: text("addedById").notNull(),
  sharedWithCivilian: boolean("sharedWithCivilian").notNull().default(false),
  // Where this evidence originated, e.g. "manual" or "police_report".
  source: text("source"),
  // When sourced from a police report, the originating LE report id.
  policeReportId: uuid("policeReportId"),
  // Links carried over from the source (e.g. report attachments): {label,url}[].
  externalLinks: jsonb("externalLinks").notNull().default([]),
  // MCD evidence locker fields.
  evidenceNumber: text("evidenceNumber"),
  evidenceCategory: text("evidenceCategory"),
  evidenceLocation: text("evidenceLocation"),
  collectedBy: text("collectedBy"),
  collectedAt: timestamp("collectedAt"),
  chainOfCustody: jsonb("chainOfCustody").notNull().default([]),
  labStatus: text("labStatus"),
  dnaStatus: text("dnaStatus"),
  fingerprintStatus: text("fingerprintStatus"),
  ballisticsStatus: text("ballisticsStatus"),
  digitalLinks: jsonb("digitalLinks").notNull().default([]),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const caseMessages = pgTable("case_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId").notNull(),
  authorId: text("authorId").notNull(),
  body: text("body").notNull(),
  mentions: text("mentions").array().notNull().default([]),
  refEvidenceIds: text("refEvidenceIds").array().notNull().default([]),
  refTimelineIds: text("refTimelineIds").array().notNull().default([]),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const casePlanItems = pgTable("case_plan_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId").notNull(),
  category: text("category").notNull().default("next_step"),
  content: text("content").notNull(),
  ownerId: text("ownerId"),
  status: text("status").notNull().default("todo"),
  dueDate: timestamp("dueDate"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const drafts = pgTable("drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId").notNull(),
  type: text("type").notNull().default("strategy_memo"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdById: text("createdById").notNull(),
  sharedWithCivilian: boolean("sharedWithCivilian").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const aiAnalyses = pgTable("ai_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId").notNull(),
  result: jsonb("result").notNull(),
  sharedWithCivilian: boolean("sharedWithCivilian").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Civilian Portal tables -------------------------------------------------

/** Client-submitted intake requests (civil lawsuit or criminal contest). */
export const intakeRequests = pgTable("intake_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  civilianId: text("civilianId").notNull(),
  type: text("type").notNull().default("civil"),
  status: text("status").notNull().default("new"),
  urgency: text("urgency").notNull().default("normal"),
  reviewerId: text("reviewerId"),
  fullName: text("fullName").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone"),
  subject: text("subject").notNull().default(""),
  data: jsonb("data").notNull().default({}),
  evidence: jsonb("evidence").notNull().default([]),
  aiReview: jsonb("aiReview"),
  linkedCaseId: uuid("linkedCaseId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

/** Staff-only internal notes attached to an intake request. */
export const intakeNotes = pgTable("intake_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  intakeId: uuid("intakeId").notNull(),
  authorId: text("authorId").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/** Secure client<->staff messages, tied to either an intake or a case. */
export const civilianMessages = pgTable("civilian_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId"),
  intakeId: uuid("intakeId"),
  senderId: text("senderId").notNull(),
  senderRole: text("senderRole").notNull().default("civilian"),
  body: text("body").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/** Links a civilian to a case and controls what they can see/do. */
export const caseCivilianAccess = pgTable("case_civilian_access", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId").notNull(),
  civilianId: text("civilianId").notNull(),
  canViewStatus: boolean("canViewStatus").notNull().default(true),
  canViewCourtDates: boolean("canViewCourtDates").notNull().default(true),
  canViewEvidence: boolean("canViewEvidence").notNull().default(false),
  canSendMessages: boolean("canSendMessages").notNull().default(true),
  canAddEvidence: boolean("canAddEvidence").notNull().default(false),
  canViewDrafts: boolean("canViewDrafts").notNull().default(false),
  canViewAiSummaries: boolean("canViewAiSummaries").notNull().default(false),
  canViewNotes: boolean("canViewNotes").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/** Law library entries: statutes, case law summaries, procedural rules, etc. */
export const lawLibrary = pgTable("law_library", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  category: text("category").notNull(), // e.g. "statute", "case_law", "rule", "guidance"
  jurisdiction: text("jurisdiction").notNull(), // e.g. "US_FEDERAL", "STATE_CA", "LOCAL_NYC"
  codeSection: text("codeSection"), // e.g. "18 U.S.C. § 1001"
  summary: text("summary"), // brief plain-english overview
  fullText: text("fullText").notNull(), // the actual law text
  tags: text("tags").array(), // e.g. ["fraud", "false-statements", "perjury"]
  relatedCharges: text("relatedCharges").array(), // e.g. ["18USC1001", "18USC1505"]
  sourceUrl: text("sourceUrl"), // external source link
  documentUrl: text("documentUrl"), // URL to uploaded document (PDF, docx, txt)
  documentText: text("documentText"), // extracted text from uploaded document (searchable & for AI)
  status: text("status").notNull().default("active"), // "active", "archived", "draft"
  // Memory Bank extension: distinguishes legal authorities from internal knowledge.
  // "legal_authority" (statutes/case law/rules) or "memory_bank" (SOPs, policies,
  // training material, custom AI knowledge).
  entryKind: text("entryKind").notNull().default("legal_authority"),
  // Origin of the entry, e.g. "manual", "imported_text", "document", "ai".
  source: text("source").notNull().default("manual"),
  // Whether this entry is eligible to be retrieved as AI context.
  aiEnabled: boolean("aiEnabled").notNull().default(true),
  // Role key of the author at creation time (for filtering/auditing).
  createdByRole: text("createdByRole"),
  lastReviewedAt: timestamp("lastReviewedAt"),
  createdById: text("createdById").notNull(),
  approvedById: text("approvedById"), // null until approved by admin
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// --- Law Enforcement ---------------------------------------------------------

/** Incident reports submitted by law enforcement officers for prosecution review. */
export const leReports = pgTable("le_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportNumber: text("reportNumber").notNull(),
  title: text("title").notNull(),
  incidentType: text("incidentType").notNull().default("other"),
  incidentDate: timestamp("incidentDate"),
  incidentLocation: text("incidentLocation"),
  agency: text("agency"),
  // Officer who filed the report (profile/user id).
  officerId: text("officerId").notNull(),
  officerName: text("officerName"),
  badgeNumber: text("badgeNumber"),
  suspectName: text("suspectName"),
  suspectDescription: text("suspectDescription"),
  proposedCharges: text("proposedCharges"),
  narrative: text("narrative").notNull(),
  probableCause: text("probableCause"),
  priority: text("priority").notNull().default("normal"),
  // "submitted", "under_review", "needs_info", "accepted", "rejected", "converted"
  status: text("status").notNull().default("submitted"),
  reviewerId: text("reviewerId"), // prosecution user who claimed/reviewed it
  reviewNotes: text("reviewNotes"),
  infoRequest: text("infoRequest"), // outstanding question from prosecution
  rejectionReason: text("rejectionReason"),
  convertedCaseId: uuid("convertedCaseId"), // set once converted to a prosecution case
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

/** Link-based evidence attached to a law enforcement report. */
export const leReportLinks = pgTable("le_report_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("reportId").notNull(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  kind: text("kind").notNull().default("evidence"), // "evidence", "photo", "video", "document"
  description: text("description"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/** Witnesses listed on a law enforcement report. */
export const leReportWitnesses = pgTable("le_report_witnesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("reportId").notNull(),
  name: text("name").notNull(),
  contact: text("contact"),
  statement: text("statement"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Prosecution -------------------------------------------------------------

/** Evidence/information requests from prosecution back to law enforcement. */
export const evidenceRequests = pgTable("evidence_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("reportId"), // request tied to a report (pre-conversion)
  caseId: uuid("caseId"), // or tied to a prosecution case (post-conversion)
  requestedById: text("requestedById").notNull(),
  assignedOfficerId: text("assignedOfficerId"), // officer expected to respond
  detail: text("detail").notNull(),
  status: text("status").notNull().default("open"), // "open", "fulfilled", "cancelled"
  response: text("response"),
  respondedById: text("respondedById"),
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/** Charges filed on a prosecution case. */
export const prosecutionCharges = pgTable("prosecution_charges", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId").notNull(),
  statute: text("statute").notNull(), // e.g. "18 U.S.C. § 1001"
  description: text("description"),
  severity: text("severity").notNull().default("misdemeanor"), // "felony", "misdemeanor", "infraction"
  lawLibraryId: uuid("lawLibraryId"), // optional link to a law library entry
  status: text("status").notNull().default("filed"), // "filed", "amended", "dismissed"
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/** Plea offers extended on a prosecution case. */
export const pleaOffers = pgTable("plea_offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId").notNull(),
  terms: text("terms").notNull(),
  recommendedSentence: text("recommendedSentence"),
  status: text("status").notNull().default("draft"), // "draft", "offered", "accepted", "rejected", "withdrawn"
  createdById: text("createdById").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

/** Witnesses on a prosecution case witness list. */
export const witnessList = pgTable("witness_list", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("witness"), // "witness", "expert", "victim", "officer"
  contact: text("contact"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/** Cached AI analysis for a prosecution case. */
export const prosecutionAnalysis = pgTable("prosecution_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId").notNull(),
  result: jsonb("result").notNull(), // structured analysis output
  generatedById: text("generatedById").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Cross-side access control ----------------------------------------------

/**
 * Side-scoped visibility for a case. Generalizes the civilian access model so
 * defense, prosecution, law enforcement, and admin views can each be granted
 * scoped visibility into a case.
 */
export const caseAccess = pgTable("case_access", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId").notNull(),
  // The party this grant applies to: a specific user, or a whole side.
  userId: text("userId"), // specific user (optional)
  side: text("side").notNull(), // "defense", "prosecution", "law_enforcement", "civilian", "admin"
  canView: boolean("canView").notNull().default(true),
  canViewEvidence: boolean("canViewEvidence").notNull().default(false),
  canViewCharges: boolean("canViewCharges").notNull().default(false),
  canMessage: boolean("canMessage").notNull().default(false),
  canViewAi: boolean("canViewAi").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Warrants ----------------------------------------------------------------

/**
 * Warrant requests created by law enforcement, reviewed and decided by judges,
 * and (on approval/closeout) linked to prosecution and defense cases.
 */
export const warrants = pgTable("warrants", {
  id: uuid("id").primaryKey().defaultRandom(),
  warrantNumber: text("warrantNumber").notNull(),
  title: text("title").notNull(),
  warrantType: text("warrantType").notNull().default("arrest"), // arrest, search, bench, other
  suspectName: text("suspectName"),
  dateOfBirth: text("dateOfBirth"),
  agency: text("agency"),
  requestingOfficerId: text("requestingOfficerId").notNull(),
  requestingOfficerName: text("requestingOfficerName"),
  requestedCharges: text("requestedCharges"),
  probableCause: text("probableCause"),
  incidentSummary: text("incidentSummary"),
  incidentDate: timestamp("incidentDate"),
  location: text("location"), // location to search or arrest
  itemsSought: text("itemsSought"), // items or persons sought
  riskLevel: text("riskLevel").notNull().default("medium"), // low, medium, high, severe
  evidenceLinks: jsonb("evidenceLinks").notNull().default([]), // {label,url}[]
  evidenceSummaries: text("evidenceSummaries"),
  relatedPoliceReportId: uuid("relatedPoliceReportId"),
  notesToJudge: text("notesToJudge"),
  // draft, submitted, under_review, needs_more_info, approved, denied, not_active, warrant_returned, closed
  status: text("status").notNull().default("draft"),
  judgeId: text("judgeId"),
  judgeName: text("judgeName"),
  judgeNotes: text("judgeNotes"),
  infoRequest: text("infoRequest"), // outstanding question from the judge
  infoResponse: text("infoResponse"), // officer's response to the info request
  denyReason: text("denyReason"),
  linkedProsecutionCaseId: uuid("linkedProsecutionCaseId"),
  linkedDefenseCaseId: uuid("linkedDefenseCaseId"),
  decidedAt: timestamp("decidedAt"),
  closedAt: timestamp("closedAt"),
  createdById: text("createdById").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

/** Append-only decision/status history for a warrant. */
export const warrantHistory = pgTable("warrant_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  warrantId: uuid("warrantId").notNull(),
  fromStatus: text("fromStatus"),
  toStatus: text("toStatus").notNull(),
  actorId: text("actorId"),
  actorName: text("actorName"),
  actorRole: text("actorRole"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/** Stored AI reviews/scoring for a warrant, by audience. */
export const warrantAiReviews = pgTable("warrant_ai_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  warrantId: uuid("warrantId").notNull(),
  audience: text("audience").notNull().default("law_enforcement"), // law_enforcement, judge, state_attorney, defense
  verdict: text("verdict").notNull().default("needs_work"), // pass, needs_work, high_risk
  completenessScore: integer("completenessScore").notNull().default(0),
  probableCauseScore: integer("probableCauseScore").notNull().default(0),
  evidenceScore: integer("evidenceScore").notNull().default(0),
  timelineScore: integer("timelineScore").notNull().default(0),
  rejectionRiskScore: integer("rejectionRiskScore").notNull().default(0),
  result: jsonb("result").notNull(), // full structured analysis
  generatedById: text("generatedById"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/** Closeout record capturing how a warrant was served / resolved. */
export const warrantCloseouts = pgTable("warrant_closeouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  warrantId: uuid("warrantId").notNull(),
  served: boolean("served").notNull().default(false),
  servedAt: timestamp("servedAt"),
  arrestLocation: text("arrestLocation"),
  arrestingOfficer: text("arrestingOfficer"),
  agency: text("agency"),
  defendantArrested: boolean("defendantArrested").notNull().default(false),
  evidenceRecovered: boolean("evidenceRecovered").notNull().default(false),
  evidenceRecoveredSummary: text("evidenceRecoveredSummary"),
  evidenceLinks: jsonb("evidenceLinks").notNull().default([]), // {label,url}[]
  defendantContested: boolean("defendantContested").notNull().default(false),
  defendantStatement: boolean("defendantStatement").notNull().default(false),
  forceUsed: boolean("forceUsed").notNull().default(false),
  additionalCharges: boolean("additionalCharges").notNull().default(false),
  additionalChargeDetails: text("additionalChargeDetails"),
  serviceIssues: text("serviceIssues"),
  closingNotes: text("closingNotes"),
  recommendedNextStep: text("recommendedNextStep"),
  closedById: text("closedById"),
  closedByName: text("closedByName"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/**
 * In-app notifications. A notification targets either a specific user
 * (`userId`) or every holder of a role (`role`); queries match on either.
 */
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId"), // specific recipient (optional)
  role: text("role"), // broadcast to all holders of this role (optional)
  type: text("type").notNull().default("info"),
  // Fine-grained category driving per-category sound preferences. See
  // lib/notification-categories.ts. Nullable for legacy rows (derived on read).
  category: text("category"),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  warrantId: uuid("warrantId"),
  caseId: uuid("caseId"),
  motionId: uuid("motionId"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/**
 * Per-user notification sound + delivery preferences. One row per user; absent
 * rows fall back to sensible defaults (see lib/notification-preferences.ts).
 */
export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("userId").primaryKey(),
  soundEnabled: boolean("soundEnabled").notNull().default(true),
  toastEnabled: boolean("toastEnabled").notNull().default(true),
  volume: integer("volume").notNull().default(70), // 0-100
  soundType: text("soundType").notNull().default("chime"),
  quietHoursEnabled: boolean("quietHoursEnabled").notNull().default(false),
  quietStart: text("quietStart").notNull().default("22:00"), // HH:MM (local)
  quietEnd: text("quietEnd").notNull().default("07:00"), // HH:MM (local)
  // Map of category key -> enabled. Missing keys default to enabled.
  categories: jsonb("categories").notNull().default({}),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// --- Motions -----------------------------------------------------------------

/**
 * Motions filed on a case by defense or prosecution, reviewed and ruled on by a
 * judge. Mirrors the warrant lifecycle: draft -> submitted -> under_review ->
 * (needs_more_info) -> granted / denied / granted_in_part / withdrawn / closed.
 */
export const motions = pgTable("motions", {
  id: uuid("id").primaryKey().defaultRandom(),
  motionNumber: text("motionNumber").notNull(),
  caseId: uuid("caseId").notNull(),
  title: text("title").notNull(),
  motionType: text("motionType").notNull().default("other"), // suppress, dismiss, continuance, discovery, bail, other
  // Which side filed the motion.
  filingSide: text("filingSide").notNull().default("defense"), // defense, prosecution
  filedById: text("filedById").notNull(),
  filedByName: text("filedByName"),
  relief: text("relief"), // what the movant is asking the court to do
  argument: text("argument"), // legal argument / grounds
  factualBasis: text("factualBasis"),
  authoritiesCited: text("authoritiesCited"), // statutes / case law referenced
  evidenceLinks: jsonb("evidenceLinks").notNull().default([]), // {label,url}[]
  hearingRequested: boolean("hearingRequested").notNull().default(false),
  urgency: text("urgency").notNull().default("normal"), // low, normal, high, emergency
  // draft, submitted, under_review, needs_more_info, granted, denied,
  // granted_in_part, withdrawn, closed
  status: text("status").notNull().default("draft"),
  judgeId: text("judgeId"),
  judgeName: text("judgeName"),
  ruling: text("ruling"), // the judge's order text
  rulingSummary: text("rulingSummary"),
  infoRequest: text("infoRequest"), // outstanding question from the judge
  infoResponse: text("infoResponse"),
  opposingResponse: text("opposingResponse"), // response from the opposing side
  opposingRespondedById: text("opposingRespondedById"),
  hearingTimelineEventId: uuid("hearingTimelineEventId"), // scheduled hearing event
  decidedAt: timestamp("decidedAt"),
  closedAt: timestamp("closedAt"),
  createdById: text("createdById").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

/** Append-only status/decision history for a motion. */
export const motionHistory = pgTable("motion_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  motionId: uuid("motionId").notNull(),
  fromStatus: text("fromStatus"),
  toStatus: text("toStatus").notNull(),
  actorId: text("actorId"),
  actorName: text("actorName"),
  actorRole: text("actorRole"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/** Stored AI reviews/scoring for a motion, by audience. */
export const motionAiReviews = pgTable("motion_ai_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  motionId: uuid("motionId").notNull(),
  audience: text("audience").notNull().default("filer"), // filer, judge, opposing
  verdict: text("verdict").notNull().default("needs_work"), // strong, needs_work, weak
  meritScore: integer("meritScore").notNull().default(0),
  authoritySupportScore: integer("authoritySupportScore").notNull().default(0),
  clarityScore: integer("clarityScore").notNull().default(0),
  grantLikelihoodScore: integer("grantLikelihoodScore").notNull().default(0),
  result: jsonb("result").notNull(), // full structured analysis incl. cited sources
  generatedById: text("generatedById"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Generic record linking --------------------------------------------------

/**
 * Polymorphic links between any two records (reports, warrants, cases, motions,
 * evidence, rulings, knowledge entries). Surfaced as a "Related Records" panel.
 * Links are treated as undirected for display but stored with a from/to pair.
 */
export const recordLinks = pgTable("record_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromType: text("fromType").notNull(), // "warrant","case","motion","report","evidence","knowledge"
  fromId: uuid("fromId").notNull(),
  toType: text("toType").notNull(),
  toId: uuid("toId").notNull(),
  relation: text("relation").notNull().default("related"), // "related","derived_from","supersedes","supports"
  note: text("note"),
  createdById: text("createdById").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})


// --- MCD expansion tables ---------------------------------------------------
// These tables support the new Major Crimes Division modules while keeping the
// original case-management tables intact for compatibility.

export const persons = pgTable("persons", {
  id: uuid("id").primaryKey().defaultRandom(),
  masterPersonNumber: text("masterPersonNumber"),
  fullName: text("fullName").notNull(),
  aliases: text("aliases").array().notNull().default([]),
  roleTags: text("roleTags").array().notNull().default([]),
  identifiers: jsonb("identifiers").notNull().default({}),
  demographics: jsonb("demographics").notNull().default({}),
  addresses: jsonb("addresses").notNull().default([]),
  phoneNumbers: text("phoneNumbers").array().notNull().default([]),
  vehicles: text("vehicles").array().notNull().default([]),
  gangAffiliations: text("gangAffiliations").array().notNull().default([]),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  plate: text("plate"),
  vin: text("vin"),
  make: text("make"),
  model: text("model"),
  color: text("color"),
  year: text("year"),
  ownerPersonId: uuid("ownerPersonId"),
  associatedCaseIds: text("associatedCaseIds").array().notNull().default([]),
  boloStatus: text("boloStatus").notNull().default("none"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const gangs = pgTable("gangs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  aliases: text("aliases").array().notNull().default([]),
  territory: text("territory"),
  rivals: text("rivals").array().notNull().default([]),
  identifiers: jsonb("identifiers").notNull().default({}),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const gangMemberships = pgTable("gang_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  gangId: uuid("gangId").notNull(),
  personId: uuid("personId").notNull(),
  status: text("status").notNull().default("suspected"),
  source: text("source"),
  confidence: text("confidence").notNull().default("unverified"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const informants = pgTable("informants", {
  id: uuid("id").primaryKey().defaultRandom(),
  codeName: text("codeName").notNull(),
  handlerId: text("handlerId"),
  reliabilityRating: text("reliabilityRating"),
  safetyStatus: text("safetyStatus").notNull().default("restricted"),
  relatedCaseIds: text("relatedCaseIds").array().notNull().default([]),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const intelReports = pgTable("intel_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId"),
  title: text("title").notNull(),
  intelType: text("intelType").notNull().default("general"),
  sourceType: text("sourceType"),
  summary: text("summary"),
  relatedPersons: text("relatedPersons").array().notNull().default([]),
  relatedVehicles: text("relatedVehicles").array().notNull().default([]),
  relatedGangs: text("relatedGangs").array().notNull().default([]),
  attachments: jsonb("attachments").notNull().default([]),
  createdById: text("createdById"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const caseChecklists = pgTable("case_checklists", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId").notNull(),
  name: text("name").notNull(),
  items: jsonb("items").notNull().default([]),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const caseLinks = pgTable("case_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceCaseId: uuid("sourceCaseId").notNull(),
  targetCaseId: uuid("targetCaseId").notNull(),
  relationship: text("relationship").notNull().default("related"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const courtPackets = pgTable("court_packets", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("caseId").notNull(),
  title: text("title").notNull(),
  packetType: text("packetType").notNull().default("prosecution_review"),
  status: text("status").notNull().default("draft"),
  probableCauseSummary: text("probableCauseSummary"),
  evidenceIndex: jsonb("evidenceIndex").notNull().default([]),
  witnessList: jsonb("witnessList").notNull().default([]),
  approvals: jsonb("approvals").notNull().default([]),
  createdById: text("createdById"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})
