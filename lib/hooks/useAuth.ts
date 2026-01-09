"use client"

import { useEffect, useState, useMemo } from "react"
import { createBrowserClient } from "@/lib/db/supabaseClient"
import type { User } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createBrowserClient(), [])

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/0521c5a0-882f-45c8-9840-6354795bbc22',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/hooks/useAuth.ts:13',message:'useAuth effect started',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/0521c5a0-882f-45c8-9840-6354795bbc22',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/hooks/useAuth.ts:16',message:'getUser response',data:{hasUser:!!user,error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      setUser(user)
      setLoading(false)
    }).catch((error) => {
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/0521c5a0-882f-45c8-9840-6354795bbc22',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/hooks/useAuth.ts:21',message:'getUser error',data:{error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/0521c5a0-882f-45c8-9840-6354795bbc22',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/hooks/useAuth.ts:28',message:'Auth state changed',data:{event:_event,hasSession:!!session},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7247/ingest/0521c5a0-882f-45c8-9840-6354795bbc22',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/hooks/useAuth.ts:37',message:'useAuth return',data:{hasUser:!!user,loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
  }, [user, loading]);
  // #endregion

  return { user, loading }
}
