"use client"

import { useState } from "react"
import { createClient } from "@/lib/db/supabaseServer"
import { useRouter, useSearchParams } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/app/dashboard"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      // TODO: Implementar magic link com Supabase client-side
      setMessage("Login functionality will be implemented with Supabase Auth")
      // const supabase = createClient()
      // const { error } = await supabase.auth.signInWithOtp({ email })
      // if (error) throw error
      // setMessage("Check your email for the login link!")
    } catch (error: any) {
      setMessage(error.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold">Sign in to Otimizator</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Enter your email to receive a magic link
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="relative block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:z-10 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Email address"
            />
          </div>

          {message && (
            <div className={`rounded-md p-3 ${message.includes("error") ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"}`}>
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send magic link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
