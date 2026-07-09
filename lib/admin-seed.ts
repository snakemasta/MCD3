import "server-only"
import { eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { roles, caseOptions, motionTemplates } from "@/lib/db/schema"
import { OPTION_CATEGORIES } from "@/lib/constants"
import { DEFAULT_ROLE_CONFIGS } from "@/lib/permissions"

export const DEFAULT_MOTION_TEMPLATES: {
  key: string
  name: string
  category: string
  description: string
  content: string
}[] = [
  {
    key: "motion_dismiss",
    name: "Motion to Dismiss",
    category: "motion",
    description: "Seeks dismissal of charges for legal insufficiency.",
    content:
      "NOW COMES the Defendant, by and through counsel, and respectfully moves this Honorable Court to dismiss the charges in the above-captioned matter on the grounds that [GROUNDS].\n\n1. STATEMENT OF FACTS\n[FACTS]\n\n2. ARGUMENT\n[ARGUMENT]\n\n3. CONCLUSION\nFor the foregoing reasons, the Defendant respectfully requests that this Court dismiss the charges.",
  },
  {
    key: "motion_suppress",
    name: "Motion to Suppress",
    category: "motion",
    description: "Excludes evidence obtained in violation of the defendant's rights.",
    content:
      "NOW COMES the Defendant and moves to suppress all evidence obtained as a result of [SEARCH/SEIZURE/STATEMENT], in violation of the Fourth, Fifth, and Fourteenth Amendments.\n\n1. FACTS\n[FACTS]\n\n2. THE SEARCH WAS UNCONSTITUTIONAL\n[ARGUMENT]\n\n3. THE EVIDENCE MUST BE EXCLUDED\n[ARGUMENT]\n\nWHEREFORE, the Defendant requests that the Court suppress the evidence.",
  },
  {
    key: "motion_compel",
    name: "Motion to Compel Discovery",
    category: "motion",
    description: "Compels the prosecution to produce discovery materials.",
    content:
      "The Defendant moves to compel the State to produce the following discovery materials: [ITEMS].\n\n1. The defense has requested these materials on [DATE].\n2. The State has failed to produce them.\n3. These materials are material to the defense under Brady v. Maryland.\n\nWHEREFORE, the Defendant requests an order compelling production.",
  },
  {
    key: "bond_motion",
    name: "Bond Motion",
    category: "motion",
    description: "Requests release on bond or a reduction of bond.",
    content:
      "The Defendant respectfully moves for [RELEASE ON RECOGNIZANCE / REDUCTION OF BOND].\n\n1. Defendant's ties to the community: [TIES]\n2. Lack of flight risk: [ARGUMENT]\n3. Lack of danger to the community: [ARGUMENT]\n\nWHEREFORE, the Defendant requests reasonable bond.",
  },
  {
    key: "motion_limine",
    name: "Motion in Limine",
    category: "motion",
    description: "Seeks a pretrial ruling to exclude prejudicial evidence.",
    content:
      "The Defendant moves in limine for an order prohibiting the State from introducing [EVIDENCE].\n\n1. The evidence is irrelevant and/or unfairly prejudicial.\n2. Its probative value is substantially outweighed by the danger of unfair prejudice.\n\nWHEREFORE, the Defendant requests the evidence be excluded.",
  },
  {
    key: "discovery_request",
    name: "Discovery Request",
    category: "discovery_request",
    description: "Formal request for discovery from the prosecution.",
    content:
      "The Defendant requests that the State produce the following:\n\n1. All police reports and incident reports.\n2. All witness statements.\n3. All physical and forensic evidence.\n4. All audio/video recordings, including bodycam and dashcam.\n5. Any exculpatory evidence under Brady v. Maryland.\n6. [OTHER]",
  },
  {
    key: "strategy_memo",
    name: "Case Strategy Memo",
    category: "strategy_memo",
    description: "Internal memo outlining defense strategy.",
    content:
      "CASE STRATEGY MEMORANDUM\n\nCase: [CASE]\nPrepared by: [AUTHOR]\nDate: [DATE]\n\n1. SUMMARY OF CHARGES\n[SUMMARY]\n\n2. THEORY OF DEFENSE\n[THEORY]\n\n3. KEY EVIDENCE\n[EVIDENCE]\n\n4. ANTICIPATED MOTIONS\n[MOTIONS]\n\n5. NEXT STEPS\n[NEXT STEPS]",
  },
  {
    key: "client_update",
    name: "Client Update Memo",
    category: "letter",
    description: "Plain-language status update for the client.",
    content:
      "Dear [CLIENT],\n\nI am writing to update you on the status of your case.\n\nWHERE THINGS STAND:\n[STATUS]\n\nWHAT HAPPENS NEXT:\n[NEXT STEPS]\n\nWHAT I NEED FROM YOU:\n[REQUESTS]\n\nPlease contact my office with any questions.\n\nSincerely,\n[ATTORNEY]",
  },
]

let seeded = false

/**
 * Idempotently seed the admin-managed default data (roles, configurable option
 * lists, motion templates). Safe to call on every admin page load; it only
 * inserts rows when a table/category is empty.
 */
export async function ensureAdminDefaults(): Promise<void> {
  if (seeded) return
  try {
    // Roles — idempotent upsert by key so new system roles (e.g. "civilian")
    // and newly added default permissions reach an already-seeded database.
    const existingRoles = await db
      .select({ key: roles.key, permissions: roles.permissions, isSystem: roles.isSystem })
      .from(roles)
    const existingByKey = new Map(existingRoles.map((r) => [r.key, r]))

    const missing = DEFAULT_ROLE_CONFIGS.filter((r) => !existingByKey.has(r.key))
    if (missing.length) {
      await db.insert(roles).values(
        missing.map((r) => ({
          key: r.key,
          label: r.label,
          description: r.description,
          permissions: r.permissions,
          isSystem: r.isSystem,
          isCounsel: r.isCounsel,
          adminAccess: r.adminAccess,
          sortOrder: r.sortOrder,
        })),
      )
    }

    // Merge any missing default permissions onto existing system roles so new
    // capabilities (like intake:review/convert) are granted without clobbering
    // any admin customizations.
    for (const cfg of DEFAULT_ROLE_CONFIGS) {
      const current = existingByKey.get(cfg.key)
      if (!current || !current.isSystem) continue
      const have = new Set(current.permissions ?? [])
      const toAdd = cfg.permissions.filter((p) => !have.has(p))
      if (toAdd.length) {
        await db
          .update(roles)
          .set({ permissions: [...(current.permissions ?? []), ...toAdd] })
          .where(eq(roles.key, cfg.key))
      }
    }

    // Case options
    const [{ count: optCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(caseOptions)
    if (Number(optCount) === 0) {
      const rows: {
        category: string
        value: string
        label: string
        sortOrder: number
      }[] = []
      for (const def of OPTION_CATEGORIES) {
        def.defaults.forEach((d, i) => {
          rows.push({ category: def.category, value: d.value, label: d.label, sortOrder: i })
        })
      }
      if (rows.length) await db.insert(caseOptions).values(rows)
    }

    // Motion templates
    const [{ count: tplCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(motionTemplates)
    if (Number(tplCount) === 0) {
      await db.insert(motionTemplates).values(
        DEFAULT_MOTION_TEMPLATES.map((t, i) => ({
          key: t.key,
          name: t.name,
          category: t.category,
          description: t.description,
          content: t.content,
          isSystem: true,
          active: true,
          sortOrder: i,
        })),
      )
    }

    seeded = true
  } catch (err) {
    console.log("[v0] ensureAdminDefaults failed:", err instanceof Error ? err.message : err)
  }
}
