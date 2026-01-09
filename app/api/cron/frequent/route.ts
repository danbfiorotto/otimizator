import { NextRequest, NextResponse } from "next/server"
import { withLock } from "@/lib/utils/cronLock"
import { processAllQueueTimesParks } from "@/lib/connectors/queueTimesRealtime"
import { processHourlyAggregations } from "@/lib/aggregations/hourly"
import { processQueueTimesCalendarForMonths } from "@/lib/connectors/queueTimesCalendarScraper"
import { getSourceMapping } from "@/lib/db/queries"
import { getParks } from "@/lib/db/queries"

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Cron job orquestrador para tarefas frequentes
 * 
 * Executa:
 * - Queue-Times Live: sempre (a cada 5 min)
 * - Aggregate Hourly: quando for hora cheia (minuto 0)
 * - Queue-Times Calendar: quando for hora múltipla de 6 (0, 6, 12, 18)
 * 
 * Roda a cada 5 minutos
 */
export async function GET(request: NextRequest) {
  // Valida secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const isHourly = currentMinute === 0
  const isCalendarTime = currentMinute === 0 && currentHour % 6 === 0

  const results: Record<string, any> = {}

  // 1. Queue-Times Live - sempre executa
  const liveResult = await withLock("queuetimes_live", async () => {
    return await processAllQueueTimesParks()
  })

  if (liveResult !== null) {
    results.live = {
      processed: liveResult.processed,
      errors: liveResult.errors,
    }
  } else {
    results.live = { skipped: "Lock not acquired" }
  }

  // 2. Aggregate Hourly - executa na hora cheia
  if (isHourly) {
    const hourlyResult = await withLock("aggregate_hourly", async () => {
      return await processHourlyAggregations()
    })

    if (hourlyResult !== null) {
      results.hourly = {
        processed: hourlyResult.processed,
        errors: hourlyResult.errors,
      }
    } else {
      results.hourly = { skipped: "Lock not acquired" }
    }
  }

  // 3. Queue-Times Calendar - executa a cada 6 horas (0, 6, 12, 18)
  if (isCalendarTime) {
    const calendarResult = await withLock("queuetimes_calendar", async () => {
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

    if (calendarResult !== null) {
      results.calendar = {
        processed: calendarResult.processed,
        errors: calendarResult.errors,
      }
    } else {
      results.calendar = { skipped: "Lock not acquired" }
    }
  }

  return NextResponse.json({
    message: "Frequent cron tasks executed",
    timestamp: now.toISOString(),
    tasks: results,
  })
}
