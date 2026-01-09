import { NextRequest, NextResponse } from "next/server"
import { withLock } from "@/lib/utils/cronLock"
import { processParkDayScoresForUpcoming } from "@/lib/aggregations/daily"
import { getParks } from "@/lib/db/queries"

const LOCK_KEY = "aggregate_daily"
const CRON_SECRET = process.env.CRON_SECRET

/**
 * Cron job para agregações daily (roda 1x/dia)
 */
export async function GET(request: NextRequest) {
  // Valida secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await withLock(LOCK_KEY, async () => {
    const parks = await getParks()
    let totalProcessed = 0
    let totalErrors = 0

    for (const park of parks) {
      const result = await processParkDayScoresForUpcoming(park.id, 60) // Próximos 60 dias
      totalProcessed += result.processed
      totalErrors += result.errors
    }

    return { processed: totalProcessed, errors: totalErrors }
  })

  if (result === null) {
    return NextResponse.json({ message: "Lock not acquired, skipping" }, { status: 200 })
  }

  return NextResponse.json({
    message: "Daily aggregation completed",
    processed: result.processed,
    errors: result.errors,
  })
}
