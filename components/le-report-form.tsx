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

export function LEReportForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    reportNumber: "",
    title: "",
    incidentType: "other",
    incidentDate: "",
    incidentLocation: "",
    agency: "",
    officerName: "",
    badgeNumber: "",
    suspectName: "",
    suspectDescription: "",
    proposedCharges: "",
    narrative: "",
    probableCause: "",
    priority: "normal",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.reportNumber || !formData.title || !formData.narrative) {
      alert("Please fill in required fields: Report Number, Title, and Narrative")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/le-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      const data = await res.json()
      console.log("[v0] Report submitted:", data)
      router.push(`/le/reports/${data.id}`)
      router.refresh()
    } catch (err) {
      console.error("[v0] Submit error:", err)
      alert(err instanceof Error ? err.message : "Submission failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6">
        <h2 className="font-semibold text-lg mb-4">Report Identification</h2>
        <div className="grid gap-4">
          <div>
            <label className="text-sm font-medium">Report Number *</label>
            <Input
              value={formData.reportNumber}
              onChange={(e) => setFormData({ ...formData, reportNumber: e.target.value })}
              placeholder="e.g., 2024-001234"
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of incident"
              className="mt-1"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Incident Type</label>
              <Select value={formData.incidentType} onValueChange={(v: any) => setFormData({ ...formData, incidentType: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="felony">Felony</SelectItem>
                  <SelectItem value="misdemeanor">Misdemeanor</SelectItem>
                  <SelectItem value="traffic">Traffic</SelectItem>
                  <SelectItem value="property">Property</SelectItem>
                  <SelectItem value="violent">Violent Crime</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={formData.priority} onValueChange={(v: any) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-lg mb-4">Incident Details</h2>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Incident Date</label>
              <Input
                type="datetime-local"
                value={formData.incidentDate}
                onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input
                value={formData.incidentLocation}
                onChange={(e) => setFormData({ ...formData, incidentLocation: e.target.value })}
                placeholder="Street address, jurisdiction"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Incident Narrative *</label>
            <Textarea
              value={formData.narrative}
              onChange={(e) => setFormData({ ...formData, narrative: e.target.value })}
              placeholder="Detailed factual account of what occurred..."
              className="mt-1 min-h-32"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Probable Cause</label>
            <Textarea
              value={formData.probableCause}
              onChange={(e) => setFormData({ ...formData, probableCause: e.target.value })}
              placeholder="Facts supporting probable cause..."
              className="mt-1 min-h-24"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-lg mb-4">Officer Information</h2>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Officer Name</label>
              <Input
                value={formData.officerName}
                onChange={(e) => setFormData({ ...formData, officerName: e.target.value })}
                placeholder="Your name"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Badge Number</label>
              <Input
                value={formData.badgeNumber}
                onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
                placeholder="Your badge number"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Agency</label>
            <Input
              value={formData.agency}
              onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
              placeholder="Law enforcement agency"
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-lg mb-4">Suspect Information</h2>
        <div className="grid gap-4">
          <div>
            <label className="text-sm font-medium">Suspect Name</label>
            <Input
              value={formData.suspectName}
              onChange={(e) => setFormData({ ...formData, suspectName: e.target.value })}
              placeholder="Name if known"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.suspectDescription}
              onChange={(e) => setFormData({ ...formData, suspectDescription: e.target.value })}
              placeholder="Physical description, clothing, identifying marks..."
              className="mt-1 min-h-20"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Proposed Charges</label>
            <Input
              value={formData.proposedCharges}
              onChange={(e) => setFormData({ ...formData, proposedCharges: e.target.value })}
              placeholder="e.g., 18 U.S.C. § 1001, State Statute XYZ"
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Report"}
        </Button>
        <Button render={<a href="/le" />} variant="outline">
          Cancel
        </Button>
      </div>
    </form>
  )
}
