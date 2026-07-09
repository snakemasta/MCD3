import type React from "react"
import { requireAdmin } from "@/lib/session"
import { ensureAdminDefaults } from "@/lib/admin-seed"
import { AdminNav } from "@/components/admin/admin-nav"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()
  // Make sure default roles, option lists and templates exist so every
  // admin section is immediately editable.
  await ensureAdminDefaults()

  return (
    <div className="flex flex-col">
      <div className="border-b border-border bg-muted/20 px-4 py-5 sm:px-6 lg:px-8">
        <h1 className="text-pretty text-xl font-semibold tracking-tight sm:text-2xl">
          Admin Panel
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure roles, case data, AI behavior, and system-wide settings.
        </p>
      </div>
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:p-8">
        <aside className="lg:w-60 lg:shrink-0">
          <AdminNav />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
