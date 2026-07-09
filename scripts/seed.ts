import { eq } from "drizzle-orm"
import { auth } from "../lib/auth"
import { db } from "../lib/db"
import { profile, cases, evidence, timelineEvents, casePlanItems, filingDeadlines, user } from "../lib/db/schema"
import { autoAssign, type Candidate } from "../lib/assign"
import { labelOf, CASE_TYPES, type Role } from "../lib/constants"

const PASSWORD = "Password123!"

const TEAM: {
  name: string
  email: string
  role: Role
  title: string
  specialties: string[]
  available: boolean
}[] = [
  { name: "Diane Foster", email: "diane@bubbalaw.test", role: "admin", title: "Managing Partner", specialties: ["Criminal Defense", "Appeals"], available: true },
  { name: "Marcus Reed", email: "marcus@bubbalaw.test", role: "attorney", title: "Senior Trial Attorney", specialties: ["Violent Crimes", "Criminal Defense"], available: true },
  { name: "Elena Vasquez", email: "elena@bubbalaw.test", role: "attorney", title: "Trial Attorney", specialties: ["DUI / Traffic", "Drug Offenses"], available: true },
  { name: "Samuel Cohen", email: "samuel@bubbalaw.test", role: "public_defender", title: "Public Defender", specialties: ["Criminal Defense", "Juvenile"], available: true },
  { name: "Priya Nair", email: "priya@bubbalaw.test", role: "paralegal", title: "Senior Paralegal", specialties: ["Discovery", "Criminal Defense"], available: true },
  { name: "Tom Becker", email: "tom@bubbalaw.test", role: "paralegal", title: "Paralegal", specialties: ["DUI / Traffic"], available: true },
  { name: "Rosa Lin", email: "rosa@bubbalaw.test", role: "investigator", title: "Lead Investigator", specialties: ["Violent Crimes", "White Collar"], available: true },
  { name: "Gloria Hayes", email: "gloria@stateda.test", role: "state_attorney", title: "State Attorney", specialties: ["Violent Crimes", "Criminal Prosecution"], available: true },
  { name: "Daniel Pierce", email: "daniel@stateda.test", role: "prosecutor", title: "Assistant Prosecutor", specialties: ["Drug Offenses", "DUI / Traffic"], available: true },
]

const DEMO_CASES: {
  title: string
  clientName: string
  charges: string
  caseType: string
  priority: string
  status: string
  notes: string
}[] = [
  { title: "State v. Jordan Phillips", clientName: "Jordan Phillips", charges: "Felony DUI, Reckless Driving", caseType: "traffic", priority: "high", status: "investigation", notes: "Client alleges faulty breathalyzer calibration. Need maintenance records." },
  { title: "State v. Andre Mitchell", clientName: "Andre Mitchell", charges: "Aggravated Assault", caseType: "criminal", priority: "urgent", status: "pre_trial", notes: "Self-defense claim. Two witnesses corroborate. Trial date approaching." },
  { title: "State v. Karen Webb", clientName: "Karen Webb", charges: "Possession with Intent to Distribute", caseType: "criminal", priority: "high", status: "investigation", notes: "Search warrant may be defective. Reviewing affidavit for probable cause." },
  { title: "State v. Leo Martinez", clientName: "Leo Martinez", charges: "Burglary, Larceny", caseType: "criminal", priority: "normal", status: "intake", notes: "Juvenile co-defendant. Identity of perpetrator disputed." },
  { title: "Webb v. Hartford Insurance", clientName: "Karen Webb", charges: "Breach of contract", caseType: "civil", priority: "low", status: "intake", notes: "Denied claim dispute. Gathering policy documents." },
  { title: "State v. Damon Cole", clientName: "Damon Cole", charges: "DUI, Open Container", caseType: "traffic", priority: "normal", status: "pre_trial", notes: "First offense. Negotiating plea to reduced charge." },
]

function genCaseNumber(i: number) {
  return `CR-${new Date().getFullYear()}-${1000 + i}`
}

async function main() {
  console.log("[v0] Seeding team members...")
  const idByEmail = new Map<string, string>()

  for (const member of TEAM) {
    const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, member.email)).limit(1)
    let userId: string
    if (existing.length) {
      userId = existing[0].id
      console.log(`[v0] ${member.email} already exists`)
    } else {
      const res = await auth.api.signUpEmail({
        body: { email: member.email, password: PASSWORD, name: member.name },
      })
      userId = res.user.id
      console.log(`[v0] Created ${member.email}`)
    }
    idByEmail.set(member.email, userId)

    await db
      .insert(profile)
      .values({
        userId,
        role: member.role,
        title: member.title,
        specialties: member.specialties,
        available: member.available,
        activeCaseCount: 0,
      })
      .onConflictDoUpdate({
        target: profile.userId,
        set: {
          role: member.role,
          title: member.title,
          specialties: member.specialties,
          available: member.available,
        },
      })
  }

  const adminId = idByEmail.get("diane@bubbalaw.test")!

  // Build candidate list for auto-assignment.
  const candidates: Candidate[] = TEAM.map((m) => ({
    userId: idByEmail.get(m.email)!,
    name: m.name,
    role: m.role,
    available: m.available,
    activeCaseCount: 0,
    specialties: m.specialties,
  }))

  console.log("[v0] Seeding cases...")
  const existingCases = await db.select({ id: cases.id }).from(cases).limit(1)
  if (existingCases.length) {
    console.log("[v0] Cases already exist, skipping case seed.")
  } else {
    for (let i = 0; i < DEMO_CASES.length; i++) {
      const c = DEMO_CASES[i]
      const assignment = autoAssign(candidates, {
        caseType: c.caseType,
        priority: c.priority,
        conflictFlag: false,
        specialtyHints: [labelOf(CASE_TYPES, c.caseType), c.charges],
      })

      // reflect the new assignment in candidate counts for the next iteration
      if (assignment.counsel) {
        const cand = candidates.find((x) => x.userId === assignment.counsel!.userId)
        if (cand) cand.activeCaseCount++
      }
      if (assignment.paralegal) {
        const cand = candidates.find((x) => x.userId === assignment.paralegal!.userId)
        if (cand) cand.activeCaseCount++
      }

      const [created] = await db
        .insert(cases)
        .values({
          title: c.title,
          caseNumber: genCaseNumber(i),
          clientName: c.clientName,
          charges: c.charges,
          caseType: c.caseType,
          priority: c.priority,
          status: c.status,
          notes: c.notes,
          assignedAttorneyId: assignment.counsel?.userId ?? null,
          assignedParalegalId: assignment.paralegal?.userId ?? null,
          createdById: adminId,
        })
        .returning()

      // A couple of evidence + timeline rows for the first few cases.
      if (i < 3) {
        await db.insert(evidence).values([
          {
            caseId: created.id,
            title: "Arresting Officer Police Report",
            evidenceType: "document",
            link: "https://docs.google.com/document/d/example-report",
            description: "Initial incident report filed by arresting officer.",
            status: "reviewed",
            tags: ["police report"],
            addedById: adminId,
          },
          {
            caseId: created.id,
            title: "Dashcam Footage",
            evidenceType: "video",
            link: "https://drive.google.com/file/d/example-dashcam",
            description: "Patrol vehicle dashcam covering the stop.",
            status: "key_evidence",
            tags: ["video", "stop"],
            addedById: adminId,
          },
        ])

        await db.insert(timelineEvents).values([
          {
            caseId: created.id,
            date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
            title: "Incident occurred",
            eventType: "incident",
            description: "Alleged offense date.",
            deadlineStatus: "complete",
          },
          {
            caseId: created.id,
            date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28),
            title: "Client arrested and charged",
            eventType: "arrest",
            deadlineStatus: "complete",
          },
        ])

        await db.insert(casePlanItems).values([
          {
            caseId: created.id,
            category: "discovery",
            content: "Request all discovery materials from the prosecution.",
            status: "in_progress",
          },
          {
            caseId: created.id,
            category: "motion",
            content: "Evaluate grounds for a motion to suppress.",
            status: "todo",
          },
        ])

        await db.insert(filingDeadlines).values({
          caseId: created.id,
          label: "Pre-trial motions due",
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
          completed: false,
        })
      }

      console.log(`[v0] Created case "${c.title}" -> counsel: ${assignment.counsel?.name ?? "none"}, paralegal: ${assignment.paralegal?.name ?? "none"}`)
    }
  }

  // Recompute counts from actual assignments.
  console.log("[v0] Recomputing case counts...")
  const allProfiles = await db.select({ userId: profile.userId }).from(profile)
  const allCases = await db.select().from(cases)
  for (const p of allProfiles) {
    const count = allCases.filter(
      (c) => c.status !== "closed" && (c.assignedAttorneyId === p.userId || c.assignedParalegalId === p.userId),
    ).length
    await db.update(profile).set({ activeCaseCount: count }).where(eq(profile.userId, p.userId))
  }

  console.log("[v0] Seed complete.")
  console.log(`[v0] Login with any seeded email and password: ${PASSWORD}`)
  console.log("[v0] Admin login: diane@bubbalaw.test")
  process.exit(0)
}

main().catch((err) => {
  console.error("[v0] Seed failed:", err)
  process.exit(1)
})
