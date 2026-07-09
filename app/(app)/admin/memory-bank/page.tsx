import { listMemoryEntries } from "@/app/actions/memory-bank"
import { PageHeader } from "@/components/page-header"
import { MemoryBankManager } from "@/components/admin/memory-bank-manager"

export default async function MemoryBankPage() {
  const entries = await listMemoryEntries()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Memory Bank"
        description="Internal knowledge — SOPs, policies, and custom AI knowledge — that the assistant can retrieve and cite. Toggle entries on or off for AI use."
      />
      <MemoryBankManager entries={entries} />
    </div>
  )
}
