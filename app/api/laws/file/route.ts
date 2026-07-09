import { type NextRequest, NextResponse } from "next/server"
import { get } from "@vercel/blob"
import { requireUser } from "@/lib/session"
import { hasPerm } from "@/lib/constants"

/**
 * Streams a privately-stored law library document to authenticated, authorized users.
 * The blob pathname is passed as a query param; the raw blob URL is never exposed.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    if (!hasPerm(user.permissions, "law-library:view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const pathname = request.nextUrl.searchParams.get("pathname")
    if (!pathname) {
      return NextResponse.json({ error: "Missing pathname" }, { status: 400 })
    }

    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    })

    if (!result) {
      return new NextResponse("Not found", { status: 404 })
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: result.blob.etag, "Cache-Control": "private, no-cache" },
      })
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
      },
    })
  } catch (err) {
    console.error("[v0] Law document delivery error:", err)
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 })
  }
}
