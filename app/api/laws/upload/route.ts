import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/session"
import { hasPerm } from "@/lib/constants"
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  extractDocumentText,
  kindFromFilename,
} from "@/lib/extract-text"

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()

    if (!hasPerm(user.permissions, "law-library:create") && !hasPerm(user.permissions, "law-library:edit")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File exceeds the 10 MB limit." }, { status: 400 })
    }

    const kind = ALLOWED_UPLOAD_TYPES[file.type] ?? kindFromFilename(file.name)
    if (!kind) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF, Word (.docx), or text file." },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const documentText = await extractDocumentText(buffer, kind)

    // Store the original document privately; it is served via /api/laws/file.
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const blob = await put(`law-library/${Date.now()}-${safeName}`, buffer, {
      access: "private",
      contentType: file.type || "application/octet-stream",
    })

    return NextResponse.json({
      documentUrl: blob.pathname,
      documentText,
      fileName: file.name,
    })
  } catch (err) {
    console.error("[v0] Law document upload error:", err)
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 })
  }
}
