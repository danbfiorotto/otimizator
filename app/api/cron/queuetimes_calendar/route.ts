import { NextRequest, NextResponse } from "next/server"
import { withLock } from "@/lib/utils/cronLock"
import { processQueueTimesCalendarForMonths } from "@/lib/connectors/queueTimesCalendarScraper"
import { getSourceMapping } from "@/lib/db/queries"
import { getParks } from "@/lib/db/queries"

const LOCK_KEY = "queuetimes_calendar"
const CRON_SECRET = process.env.CRON_SECRET

/**
 * Cron job para atualizar crowd calendar (roda a cada 6h)
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
      try {
        // Busca Queue-Times ID
        const mapping = await getSourceMapping("queue_times", "park", park.id)
        if (!mapping) {
          // Tenta buscar por internal_id reverso
          const { data: reverseMapping } = await import("@/lib/db/supabaseServer").then((m) =>
            m.createServiceClient().from("source_mappings").select("source_id").eq("internal_id", park.id).eq("source", "queue_times").eq("entity_type", "park").single()
          )
          if (!reverseMapping) continue

          const queueTimesId = parseInt(reverseMapping.source_id, 10)
          const result = await processQueueTimesCalendarForMonths(queueTimesId, 6)
          totalProcessed += result.processed
          totalErrors += result.errors
        } else {
          const queueTimesId = parseInt(mapping.source_id, 10)
          const result = await processQueueTimesCalendarForMonths(queueTimesId, 6)
          totalProcessed += result.processed
          totalErrors += result.errors
        }
      } catch (error) {
        console.error(`Error processing calendar for park ${park.id}:`, error)
        totalErrors++
      }
    }

    return { processed: totalProcessed, errors: totalErrors }
  })

  if (result === null) {
    return NextResponse.json({ message: "Lock not acquired, skipping" }, { status: 200 })
  }

  return NextResponse.json({
    message: "Queue-Times calendar updated",
    processed: result.processed,
    errors: result.errors,
  })
}
