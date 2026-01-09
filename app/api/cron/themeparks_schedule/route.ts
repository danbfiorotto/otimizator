import { NextRequest, NextResponse } from "next/server"
import { withLock } from "@/lib/utils/cronLock"

const LOCK_KEY = "themeparks_schedule"
const CRON_SECRET = process.env.CRON_SECRET

/**
 * Cron job para atualizar schedule do ThemeParks.wiki (roda 1x/dia)
 */
export async function GET(request: NextRequest) {
  // Valida secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await withLock(LOCK_KEY, async () => {
    // TODO: Implementar fetch e processamento de schedule do ThemeParks.wiki
    // Por enquanto, apenas retorna sucesso
    return { processed: 0, errors: 0 }
  })

  if (result === null) {
    return NextResponse.json({ message: "Lock not acquired, skipping" }, { status: 200 })
  }

  return NextResponse.json({
    message: "ThemeParks schedule updated",
    processed: result.processed,
    errors: result.errors,
  })
}
