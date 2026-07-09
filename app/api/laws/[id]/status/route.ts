import { requireUser } from "@/lib/session"
import { hasPerm } from "@/lib/constants"
import { db } from "@/lib/db"
import { lawLibrary } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { eq } from "drizzle-orm"

const VALID_STATUSES = ["active", "draft", "archived"] as const
type LawStatus = (typeof VALID_STATUSES)[number]

/**
 * Transition a law library entry's lifecycle status.
 * - active   (publish/approve) → requires law-library:approve
 * - archived (soft delete)      → requires law-library:archive
 * - draft    (unpublish)        → requires law-library:approve or law-library:edit
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await req.json()
    const status = body.status as LawStatus

    if (!VALID_STATUSES.includes(status)) {
      return Response.json({ error: "Invalid status." }, { status: 400 })
    }

    const permitted =
      status === "active"
        ? hasPerm(user.permissions, "law-library:approve")
        : status === "archived"
          ? hasPerm(user.permissions, "law-library:archive")
          : hasPerm(user.permissions, "law-library:approve") || hasPerm(user.permissions, "law-library:edit")

    if (!permitted) {
      return Response.json({ error: "You do not have permission for this action." }, { status: 403 })
    }

    const [law] = await db
      .update(lawLibrary)
      .set({
        status,
        ...(status === "active" ? { approvedById: user.id, lastReviewedAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(lawLibrary.id, id))
      .returning()

    if (!law) {
      return Response.json({ error: "Entry not found." }, { status: 404 })
    }

    const verb = status === "active" ? "published" : status === "archived" ? "archived" : "moved to draft"
    await logAudit({
      actorId: user.id,
      actorName: user.name,
      action: `law_library.${status}`,
      category: "system",
      targetType: "law_library",
      targetId: law.id,
      summary: `${verb.charAt(0).toUpperCase() + verb.slice(1)} law library entry "${law.title}"`,
    })

    return Response.json(law)
  } catch (err) {
    console.error("[v0] Law status change error:", err)
    return Response.json({ error: "Failed to update status." }, { status: 500 })
  }
}
