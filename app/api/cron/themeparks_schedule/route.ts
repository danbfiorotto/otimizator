import { NextRequest, NextResponse } from "next/server"
import { withLock } from "@/lib/utils/cronLock"
import { getParks } from "@/lib/db/queries"
import { processThemeParksScheduleForAllParks } from "@/lib/connectors/themeParksScheduleProcessor"

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
    const parks = await getParks()
    return await processThemeParksScheduleForAllParks(parks, 60)
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
