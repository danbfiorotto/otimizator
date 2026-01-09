import { NextRequest, NextResponse } from "next/server"
import { withLock } from "@/lib/utils/cronLock"
import { processQueueTimesStats } from "@/lib/connectors/queueTimesStatsScraper"
import { processParkDayScoresForUpcoming } from "@/lib/aggregations/daily"
import { processThemeParksScheduleForAllParks } from "@/lib/connectors/themeParksScheduleProcessor"
import { getSourceMapping } from "@/lib/db/queries"
import { getParks } from "@/lib/db/queries"

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Cron job orquestrador para tarefas diárias
 * 
 * Executa todas as tarefas diárias em sequência:
 * - Queue-Times Stats: Atualiza estatísticas históricas
 * - ThemeParks Schedule: Atualiza horários de funcionamento
 * - Aggregate Daily: Calcula park_day_scores
 * 
 * Roda 1x por dia (às 3h) e executa todas as tarefas em sequência
 */
export async function GET(request: NextRequest) {
  // Valida secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const results: Record<string, any> = {}

  // 1. Queue-Times Stats
  const statsResult = await withLock("queuetimes_stats", async () => {
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

  if (statsResult !== null) {
    results.stats = {
      processed: statsResult.processed,
      errors: statsResult.errors,
    }
  } else {
    results.stats = { skipped: "Lock not acquired" }
  }

  // 2. ThemeParks Schedule
  const scheduleResult = await withLock("themeparks_schedule", async () => {
    const parks = await getParks()
    return await processThemeParksScheduleForAllParks(parks, 60)
  })

  if (scheduleResult !== null) {
    results.schedule = {
      processed: scheduleResult.processed,
      errors: scheduleResult.errors,
    }
  } else {
    results.schedule = { skipped: "Lock not acquired" }
  }

  // 3. Aggregate Daily
  const dailyResult = await withLock("aggregate_daily", async () => {
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

  if (dailyResult !== null) {
    results.daily = {
      processed: dailyResult.processed,
      errors: dailyResult.errors,
    }
  } else {
    results.daily = { skipped: "Lock not acquired" }
  }

  return NextResponse.json({
    message: "Daily cron tasks executed",
    timestamp: now.toISOString(),
    tasks: results,
  })
}
