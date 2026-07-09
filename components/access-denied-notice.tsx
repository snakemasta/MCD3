"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function AccessDeniedNotice({ email }: { email: string }) {
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
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Lock className="size-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-balance">
            No interfaces available
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            Your account ({email}) doesn&apos;t currently have access to any
            interface. An administrator needs to assign you a role or grant you
            interface access before you can continue.
          </p>
        </div>
        <Button onClick={signOut} disabled={loading} className="w-full">
          {loading ? <Spinner /> : "Sign out"}
        </Button>
      </div>
    </div>
  )
}
