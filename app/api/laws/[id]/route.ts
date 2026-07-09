import { requireUser } from "@/lib/session"
import { hasPerm } from "@/lib/constants"
import { db } from "@/lib/db"
import { lawLibrary } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { eq } from "drizzle-orm"
import { del } from "@vercel/blob"

function cleanArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => String(v).trim()).filter(Boolean)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    const { id } = await params

    if (!hasPerm(user.permissions, "law-library:edit")) {
      return Response.json({ error: "You do not have permission to edit entries." }, { status: 403 })
    }

    const body = await req.json()
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const fullText = typeof body.fullText === "string" ? body.fullText.trim() : ""
    if (!title || !fullText) {
      return Response.json({ error: "Title and full text are required." }, { status: 400 })
    }

    const isMemory = body.entryKind === "memory_bank"

    const [law] = await db
      .update(lawLibrary)
      .set({
        title,
        category: isMemory ? "guidance" : body.category || "statute",
        jurisdiction: isMemory ? "OTHER" : body.jurisdiction || "US_FEDERAL",
        codeSection: body.codeSection || null,
        summary: body.summary || null,
        fullText,
        tags: cleanArray(body.tags),
        relatedCharges: cleanArray(body.relatedCharges),
        sourceUrl: body.sourceUrl || null,
        documentUrl: body.documentUrl || null,
        documentText: body.documentText || null,
        entryKind: isMemory ? "memory_bank" : "legal_authority",
        ...(body.aiEnabled !== undefined ? { aiEnabled: body.aiEnabled } : {}),
        updatedAt: new Date(),
      })
      .where(eq(lawLibrary.id, id))
      .returning()

    if (!law) {
      return Response.json({ error: "Entry not found." }, { status: 404 })
    }

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      action: "law_library.update",
      category: "system",
      targetType: "law_library",
      targetId: law.id,
      summary: `Updated law library entry "${law.title}"`,
    })

    return Response.json(law)
  } catch (err) {
    console.error("[v0] Law update error:", err)
    return Response.json({ error: "Failed to update entry." }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    const { id } = await params

    if (!hasPerm(user.permissions, "law-library:delete")) {
      return Response.json({ error: "You do not have permission to delete entries." }, { status: 403 })
    }

    const [law] = await db.delete(lawLibrary).where(eq(lawLibrary.id, id)).returning()

    if (!law) {
      return Response.json({ error: "Entry not found." }, { status: 404 })
    }

    // Best-effort cleanup of the attached private document.
    if (law.documentUrl) {
      try {
        await del(law.documentUrl)
      } catch (e) {
        console.log("[v0] blob cleanup skipped:", e instanceof Error ? e.message : e)
      }
    }

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      action: "law_library.delete",
      category: "system",
      targetType: "law_library",
      targetId: law.id,
      summary: `Deleted law library entry "${law.title}"`,
    })

    return Response.json({ success: true })
  } catch (err) {
    console.error("[v0] Law delete error:", err)
    return Response.json({ error: "Failed to delete entry." }, { status: 500 })
  }
}
