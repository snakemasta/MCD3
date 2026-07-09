"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { lawLibrary } from "@/lib/db/schema"
import type { InferSelectModel } from "drizzle-orm"

type Law = InferSelectModel<typeof lawLibrary>

const CATEGORIES = [
  { value: "statute", label: "Statute / Code" },
  { value: "case_law", label: "Case Law" },
  { value: "rule", label: "Procedural Rule" },
  { value: "guidance", label: "Guidance / Opinion" },
]

const JURISDICTIONS = [
  { value: "US_FEDERAL", label: "U.S. Federal" },
  { value: "STATE_CA", label: "California State" },
  { value: "STATE_NY", label: "New York State" },
  { value: "STATE_TX", label: "Texas State" },
  { value: "LOCAL_NYC", label: "New York City" },
  { value: "OTHER", label: "Other" },
]

interface LawFormProps {
  userId: string
  initialData?: Law
}

export function LawForm({ userId, initialData }: LawFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [entryKind, setEntryKind] = useState(initialData?.entryKind ?? "legal_authority")
  const [aiEnabled, setAiEnabled] = useState(initialData?.aiEnabled ?? true)
  const isMemoryBank = entryKind === "memory_bank"

  const [title, setTitle] = useState(initialData?.title ?? "")
  const [category, setCategory] = useState(initialData?.category ?? "statute")
  const [jurisdiction, setJurisdiction] = useState(initialData?.jurisdiction ?? "US_FEDERAL")
  const [codeSection, setCodeSection] = useState(initialData?.codeSection ?? "")
  const [summary, setSummary] = useState(initialData?.summary ?? "")
  const [fullText, setFullText] = useState(initialData?.fullText ?? "")
  const [tags, setTags] = useState(initialData?.tags?.join(", ") ?? "")
  const [relatedCharges, setRelatedCharges] = useState(initialData?.relatedCharges?.join(", ") ?? "")
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl ?? "")
  const [documentUrl, setDocumentUrl] = useState(initialData?.documentUrl ?? "")
  const [documentText, setDocumentText] = useState(initialData?.documentText ?? "")

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/laws/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Upload failed")
      }

      const data = await res.json()
      setDocumentUrl(data.documentUrl)
      setDocumentText(data.documentText)
      setFullText(data.documentText) // Pre-fill fullText with extracted content
      console.log("[v0] Document uploaded:", data.fileName)
    } catch (err) {
      console.error("[v0] Upload error:", err)
      alert(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !fullText) {
      alert("Title and full text are required.")
      return
    }

    setLoading(true)
    try {
      const url = initialData ? `/api/laws/${initialData.id}` : "/api/laws"
      const method = initialData ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          entryKind,
          aiEnabled,
          category: isMemoryBank ? "guidance" : category,
          jurisdiction: isMemoryBank ? "OTHER" : jurisdiction,
          codeSection: codeSection || null,
          summary: summary || null,
          fullText,
          tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
          relatedCharges: relatedCharges ? relatedCharges.split(",").map(c => c.trim()).filter(Boolean) : [],
          sourceUrl: sourceUrl || null,
          documentUrl: documentUrl || null,
          documentText: documentText || null,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to save entry.")
      }

      router.push(`/law-library/${data.id}`)
      router.refresh()
    } catch (err) {
      console.error("[v0] Submit error:", err)
      alert(err instanceof Error ? err.message : "An error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Entry Type *</label>
          <Select value={entryKind} onValueChange={setEntryKind as any}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="legal_authority">Legal Authority (statute, case law, rule)</SelectItem>
              <SelectItem value="memory_bank">Memory Bank (SOP, policy, training, custom knowledge)</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            {isMemoryBank
              ? "Internal knowledge the AI can cite as grounded context."
              : "Formal legal authority indexed for research and AI citations."}
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="pr-4">
            <p className="text-sm font-medium">Available to AI</p>
            <p className="text-xs text-muted-foreground">
              Allow the assistant to retrieve and cite this entry as context.
            </p>
          </div>
          <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
        </div>

        <div>
          <label className="text-sm font-medium">Title *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              isMemoryBank
                ? "e.g., Discovery Request Standard Operating Procedure"
                : "e.g., 18 U.S.C. § 1001 - Statements or entries generally"
            }
            className="mt-1"
          />
        </div>

        {!isMemoryBank && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Category *</label>
                <Select value={category} onValueChange={setCategory as any}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Jurisdiction *</label>
                <Select value={jurisdiction} onValueChange={setJurisdiction as any}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JURISDICTIONS.map((j) => (
                      <SelectItem key={j.value} value={j.value}>
                        {j.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Code Section / Citation</label>
              <Input
                value={codeSection}
                onChange={(e) => setCodeSection(e.target.value)}
                placeholder="e.g., 18 U.S.C. § 1001"
                className="mt-1"
              />
            </div>
          </>
        )}

        <div>
          <label className="text-sm font-medium">Summary</label>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief plain-English overview of the law."
            className="mt-1 h-20"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Full Text *</label>
          <Textarea
            value={fullText}
            onChange={(e) => setFullText(e.target.value)}
            placeholder="The complete text of the statute, rule, or case law summary."
            className="mt-1 h-40 font-mono text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Tags</label>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="fraud, false-statements, perjury (comma-separated)"
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Related Charges</label>
          <Input
            value={relatedCharges}
            onChange={(e) => setRelatedCharges(e.target.value)}
            placeholder="18USC1001, 18USC1505 (comma-separated charge codes)"
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Source URL</label>
          <Input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://www.law.cornell.edu/uscode/text/18/1001"
            type="url"
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Upload Document (Optional)</label>
          <p className="text-xs text-gray-500 mb-2">PDF, Word (.docx), or text files up to 10 MB. Text will be extracted and made searchable.</p>
          <Input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileUpload}
            disabled={uploading}
            className="mt-1"
          />
          {documentUrl && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded text-sm">
              ✓ Document uploaded and text extracted ({documentText.length} characters)
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update Law" : "Create Law"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
