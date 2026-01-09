"use client"

import { useEffect, Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@/lib/db/supabaseClient"

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/0521c5a0-882f-45c8-9840-6354795bbc22',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(auth)/callback/page.tsx:13',message:'Callback started',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        
        const supabase = createBrowserClient()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/0521c5a0-882f-45c8-9840-6354795bbc22',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(auth)/callback/page.tsx:18',message:'Session retrieved',data:{hasSession:!!session,error:sessionError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        
        if (sessionError) throw sessionError
        
        const redirect = searchParams.get("redirect") || "/app/dashboard"
        
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/0521c5a0-882f-45c8-9840-6354795bbc22',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(auth)/callback/page.tsx:24',message:'Redirecting',data:{redirect,hasSession:!!session},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        
        router.push(redirect)
      } catch (err: any) {
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/0521c5a0-882f-45c8-9840-6354795bbc22',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(auth)/callback/page.tsx:28',message:'Callback error',data:{error:err?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        setError(err.message || "Erro ao processar login")
      }
    }

    handleCallback()
  }, [router, searchParams])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive">Erro no Login</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Voltar para Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Completando login...</h2>
        <p className="mt-2 text-muted-foreground">Por favor, aguarde</p>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
