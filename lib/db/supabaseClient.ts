import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

/**
 * Cliente Supabase para uso no browser (client-side)
 * Este arquivo não importa next/headers para evitar erros em Client Components
 */
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}
