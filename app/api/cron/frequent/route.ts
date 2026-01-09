import { NextRequest, NextResponse } from "next/server"
import { withLock } from "@/lib/utils/cronLock"
import { processHourlyAggregations } from "@/lib/aggregations/hourly"
import { processQueueTimesCalendarForMonths } from "@/lib/connectors/queueTimesCalendarScraper"
import { getSourceMapping } from "@/lib/db/queries"
import { getParks } from "@/lib/db/queries"

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Cron job orquestrador para tarefas periódicas (compatível com plano Hobby - 1x por dia)
 * 
 * Executa:
 * - Aggregate Hourly: Calcula estatísticas por hora (p50/p80/p95)
 * - Queue-Times Calendar: Atualiza crowd calendar (próximos 6 meses)
 * 
 * Nota: Queue-Times Live é atualizado on-demand via endpoint /api/parks/[parkId]/live
 * devido à limitação do plano Hobby (apenas cron jobs diários permitidos)
 * 
 * Roda 1x por dia (às 2h)
 */
export async function GET(request: NextRequest) {
  // Valida secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const results: Record<string, any> = {}

  // 1. Aggregate Hourly - processa agregações por hora
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

  // 2. Queue-Times Calendar - atualiza crowd calendar
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

  return NextResponse.json({
    message: "Periodic cron tasks executed",
    timestamp: now.toISOString(),
    tasks: results,
  })
}
