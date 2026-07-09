"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Scale } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { claimCivilianRole } from "@/app/actions/portal-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"

export function RegisterForm({
  mode,
  firmName = "MCD CaseOps Platform",
}: {
  mode: "sign-in" | "sign-up"
  firmName?: string
}) {
  const router = useRouter()
  const isSignUp = mode === "sign-up"
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({ email, password, name })
        if (error) throw new Error(error.message)
        const res = await claimCivilianRole()
        if (!res.ok) throw new Error(res.error ?? "Could not finish registration")
      } else {
        const { error } = await authClient.signIn.email({ email, password })
        if (error) throw new Error(error.message)
      }
      router.push("/portal")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Scale className="size-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">{firmName} Informant Portal</h1>
          <p className="mt-1 text-pretty text-sm text-muted-foreground">
            {isSignUp
              ? "Create an account to request legal help and track your case."
              : "Sign in to manage your requests and message your legal team."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-6">
          <FieldGroup>
            {isSignUp && (
              <Field>
                <FieldLabel htmlFor="name">Full name</FieldLabel>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  autoComplete="name"
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
              {isSignUp && (
                <FieldDescription>Use at least 8 characters.</FieldDescription>
              )}
            </Field>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Spinner data-icon="inline-start" />}
              {isSignUp ? "Create account" : "Sign in"}
            </Button>
          </FieldGroup>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account? " : "New client? "}
          <Link
            href={isSignUp ? "/sign-in" : "/register"}
            className="font-medium text-primary hover:underline"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  )
}
