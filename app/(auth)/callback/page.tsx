"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function CallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // TODO: Processar callback do Supabase Auth
    const redirect = searchParams.get("redirect") || "/app/dashboard"
    router.push(redirect)
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Completing login...</h2>
        <p className="mt-2 text-muted-foreground">Please wait</p>
      </div>
    </div>
  )
}
