import { NextRequest, NextResponse } from "next/server"
import { clearGroupSession } from "@/lib/utils/session"

/**
 * POST /api/groups/leave - Sai do grupo atual (limpa sessão)
 */
export async function POST(request: NextRequest) {
  try {
    await clearGroupSession()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error leaving group:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
