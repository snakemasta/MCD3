import { requireUser } from "@/lib/session"
import { hasPerm } from "@/lib/constants"
import { db } from "@/lib/db"
import { lawLibrary } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"

function cleanArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => String(v).trim()).filter(Boolean)
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()

    if (!hasPerm(user.permissions, "law-library:create")) {
      return Response.json({ error: "You do not have permission to create entries." }, { status: 403 })
    }

    const body = await req.json()

    const title = typeof body.title === "string" ? body.title.trim() : ""
    const fullText = typeof body.fullText === "string" ? body.fullText.trim() : ""
    if (!title || !fullText) {
      return Response.json({ error: "Title and full text are required." }, { status: 400 })
    }

    const isMemory = body.entryKind === "memory_bank"
    // Authors who can approve publish immediately; otherwise the entry waits as a draft.
    const canApprove = hasPerm(user.permissions, "law-library:approve")
    const status = canApprove ? "active" : "draft"

    const [law] = await db
      .insert(lawLibrary)
      .values({
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
        aiEnabled: body.aiEnabled ?? true,
        source: body.documentText ? "document" : "manual",
        createdByRole: user.role ?? null,
        status,
        approvedById: canApprove ? user.id : null,
        createdById: user.id,
      })
      .returning()

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      action: "law_library.create",
      category: "system",
      targetType: "law_library",
      targetId: law.id,
      summary: `Created ${isMemory ? "memory bank" : "law library"} entry "${law.title}" (${status})`,
    })

    return Response.json(law)
  } catch (err) {
    console.error("[v0] Law create error:", err)
    return Response.json({ error: "Failed to create entry." }, { status: 500 })
  }
}
