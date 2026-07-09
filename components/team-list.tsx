"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Users } from "lucide-react"
import type { TeamMember } from "@/app/actions/team"
import { updateMember } from "@/app/actions/team"
import { ROLES, type Role, can, labelOf, itemsOf } from "@/lib/constants"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { RoleBadge } from "@/components/case-badges"

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function TeamList({
  members,
  viewerRole,
}: {
  members: TeamMember[]
  viewerRole: Role
}) {
  const canManage = can(viewerRole, "team:manage")

  if (members.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users />
          </EmptyMedia>
          <EmptyTitle>No team members yet</EmptyTitle>
          <EmptyDescription>
            Team members appear here once they sign up for an account.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {members.map((m) => (
        <MemberCard key={m.userId} member={m} canManage={canManage} />
      ))}
    </div>
  )
}

function MemberCard({
  member,
  canManage,
}: {
  member: TeamMember
  canManage: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [available, setAvailable] = useState(member.available)

  function changeRole(role: string | null) {
    if (!role) return
    startTransition(async () => {
      try {
        await updateMember({ userId: member.userId, role: role as Role })
        toast.success(`${member.name} is now ${labelOf(ROLES, role)}`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update role")
      }
    })
  }

  function toggleAvailable(next: boolean) {
    setAvailable(next)
    startTransition(async () => {
      try {
        await updateMember({ userId: member.userId, available: next })
        toast.success(next ? "Marked available" : "Marked unavailable")
      } catch (e) {
        setAvailable(!next)
        toast.error(e instanceof Error ? e.message : "Failed to update")
      }
    })
  }

  return (
    <Card className="gap-0">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <Avatar className="size-11">
            <AvatarFallback>{initials(member.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{member.name}</p>
            <p className="truncate text-sm text-muted-foreground">{member.email}</p>
            {member.title && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {member.title}
              </p>
            )}
          </div>
          <RoleBadge role={member.role} />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">{member.activeCaseCount} active</Badge>
          <Badge variant={available ? "outline" : "secondary"}>
            {available ? "Available" : "Unavailable"}
          </Badge>
        </div>

        {member.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {member.specialties.map((s) => (
              <Badge key={s} variant="outline" className="font-normal">
                {s}
              </Badge>
            ))}
          </div>
        )}

        {canManage && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Role</span>
              <Select
                items={itemsOf(ROLES)}
                value={member.role}
                onValueChange={changeRole}
                disabled={pending}
              >
                <SelectTrigger size="sm" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Available for assignment</span>
              <Switch
                checked={available}
                onCheckedChange={toggleAvailable}
                disabled={pending}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
