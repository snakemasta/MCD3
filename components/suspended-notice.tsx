"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ban } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function SuspendedNotice({ email }: { email: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function signOut() {
    setLoading(true)
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Ban className="size-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-balance">
            Your account is suspended
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            Access for {email} has been disabled by an administrator. If you
            believe this is a mistake, please contact your office administrator.
          </p>
        </div>
        <Button onClick={signOut} disabled={loading} className="w-full">
          {loading ? <Spinner /> : "Sign out"}
        </Button>
      </div>
    </div>
  )
}
