import { NextRequest, NextResponse } from "next/server"
import { withLock } from "@/lib/utils/cronLock"
import { processHourlyAggregations } from "@/lib/aggregations/hourly"

const LOCK_KEY = "aggregate_hourly"
const CRON_SECRET = process.env.CRON_SECRET

/**
 * Cron job para agregações hourly (roda 1x/hora)
 */
export async function GET(request: NextRequest) {
  // Valida secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await withLock(LOCK_KEY, async () => {
    return await processHourlyAggregations()
  })

  if (result === null) {
    return NextResponse.json({ message: "Lock not acquired, skipping" }, { status: 200 })
  }

  return NextResponse.json({
    message: "Hourly aggregation completed",
    processed: result.processed,
    errors: result.errors,
  })
}
