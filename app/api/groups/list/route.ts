import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/db/supabaseServer"

/**
 * GET /api/groups/list - Retorna lista de todos os grupos disponíveis
 * Retorna apenas informações públicas (nome, slug, id, data de criação)
 * Não retorna senha ou informações sensíveis
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    const { data: groups, error } = await supabase
      .from("groups")
      .select("id, name, slug, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching groups list:", error)
      return NextResponse.json(
        { error: "Failed to fetch groups" },
        { status: 500 }
      )
    }

    return NextResponse.json(groups || [])
  } catch (error) {
    console.error("Error in groups list endpoint:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
