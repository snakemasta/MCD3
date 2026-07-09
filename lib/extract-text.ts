import mammoth from "mammoth"

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB

export const ALLOWED_UPLOAD_TYPES: Record<string, "pdf" | "docx" | "txt"> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
}

/** Map a filename extension to a supported kind as a fallback when the MIME type is generic. */
export function kindFromFilename(name: string): "pdf" | "docx" | "txt" | null {
  const lower = name.toLowerCase()
  if (lower.endsWith(".pdf")) return "pdf"
  if (lower.endsWith(".docx")) return "docx"
  if (lower.endsWith(".txt")) return "txt"
  return null
}

/**
 * Extract plain text from an uploaded document buffer.
 * Supports PDF (pdfjs-dist), DOCX (mammoth), and plain text.
 * Returns a best-effort string; never throws for empty/parse issues.
 */
export async function extractDocumentText(
  buffer: Buffer,
  kind: "pdf" | "docx" | "txt",
): Promise<string> {
  try {
    if (kind === "txt") {
      return buffer.toString("utf-8").trim()
    }

    if (kind === "docx") {
      const result = await mammoth.extractRawText({ buffer })
      return result.value.trim()
    }

    if (kind === "pdf") {
      // Use the legacy build which runs without a browser worker in Node.
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
      // Disable the worker so it runs in the serverless runtime.
      ;(pdfjs as any).GlobalWorkerOptions.workerSrc = ""
      const uint8 = new Uint8Array(buffer)
      const doc = await pdfjs.getDocument({ data: uint8, useWorkerFetch: false, useSystemFonts: true }).promise

      const pages: string[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const content = await page.getTextContent()
        const text = content.items
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ")
        pages.push(text)
      }
      return pages.join("\n\n").replace(/\s+\n/g, "\n").trim()
    }

    return ""
  } catch (err) {
    console.error("[v0] extractDocumentText error:", err)
    return ""
  }
}
