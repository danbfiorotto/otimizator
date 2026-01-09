import { NextRequest, NextResponse } from "next/server"
import { withLock } from "@/lib/utils/cronLock"
import { processQueueTimesStats } from "@/lib/connectors/queueTimesStatsScraper"
import { getSourceMapping } from "@/lib/db/queries"
import { getParks } from "@/lib/db/queries"

const LOCK_KEY = "queuetimes_stats"
const CRON_SECRET = process.env.CRON_SECRET

/**
 * Cron job para atualizar stats (roda 1x/dia)
 */
export async function GET(request: NextRequest) {
  // Valida secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await withLock(LOCK_KEY, async () => {
    const parks = await getParks()
    let processed = 0
    let errors = 0

    for (const park of parks) {
      try {
        const mapping = await getSourceMapping("queue_times", "park", park.id)
        if (!mapping) continue

        const queueTimesId = parseInt(mapping.source_id, 10)
        await processQueueTimesStats(queueTimesId)
        processed++
      } catch (error) {
        console.error(`Error processing stats for park ${park.id}:`, error)
        errors++
      }
    }

    return { processed, errors }
  })

  if (result === null) {
    return NextResponse.json({ message: "Lock not acquired, skipping" }, { status: 200 })
  }

  return NextResponse.json({
    message: "Queue-Times stats updated",
    processed: result.processed,
    errors: result.errors,
  })
}
