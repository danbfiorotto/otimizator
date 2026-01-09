import {
  getParkCalendarDays,
  upsertParkDayScore,
  getAttractionsByPark,
  getAttractionHourStats,
} from "@/lib/db/queries"
import { getDayOfWeek, getMonth, parseDate } from "@/lib/utils/time"

const TOP_ATTRACTIONS_COUNT = 10 // Top N atrações para calcular crowd score

/**
 * Calcula crowd score usando método 'calendar' (quando disponível)
 */
export async function calculateCalendarCrowdScore(
  parkId: string,
  date: string
): Promise<number | null> {
  const calendarDays = await getParkCalendarDays(parkId, date, date)
  if (calendarDays.length === 0) {
    return null
  }

  const day = calendarDays[0]
  if (day.crowd_percent === null) {
    return null
  }

  // Normaliza para 0-1
  return day.crowd_percent / 100
}

/**
 * Calcula crowd score usando método 'computed' (média p80 das top N atrações)
 */
export async function calculateComputedCrowdScore(
  parkId: string,
  date: string
): Promise<number | null> {
  const dateObj = parseDate(date)
  const month = getMonth(dateObj)
  const dow = getDayOfWeek(dateObj)

  // Busca atrações do parque
  const attractions = await getAttractionsByPark(parkId)

  if (attractions.length === 0) {
    return null
  }

  // Calcula p80 médio por hora do dia (10:00-18:00, horários úteis)
  const usefulHours = Array.from({ length: 9 }, (_, i) => i + 10) // 10-18
  const p80Values: number[] = []

  for (const attraction of attractions) {
    for (const hour of usefulHours) {
      const stats = await getAttractionHourStats(attraction.id, month, dow, hour)
      if (stats && stats.p80 !== null) {
        p80Values.push(stats.p80)
      }
    }
  }

  if (p80Values.length === 0) {
    return null
  }

  // Ordena e pega top N (maiores p80)
  const sorted = [...p80Values].sort((a, b) => b - a)
  const topN = sorted.slice(0, Math.min(TOP_ATTRACTIONS_COUNT, sorted.length))

  // Calcula média dos top N
  const avgP80 = topN.reduce((sum, val) => sum + val, 0) / topN.length

  // Normaliza para 0-1 (assumindo p80 máximo de 180 minutos)
  const normalized = Math.min(avgP80 / 180, 1)

  return normalized
}

/**
 * Calcula crowd score usando método 'hybrid' (combina calendar e computed)
 */
export async function calculateHybridCrowdScore(
  parkId: string,
  date: string
): Promise<number | null> {
  const calendarScore = await calculateCalendarCrowdScore(parkId, date)
  const computedScore = await calculateComputedCrowdScore(parkId, date)

  if (calendarScore !== null && computedScore !== null) {
    // Média ponderada: 70% calendar, 30% computed
    return calendarScore * 0.7 + computedScore * 0.3
  }

  // Fallback para o que estiver disponível
  return calendarScore ?? computedScore
}

/**
 * Processa park_day_scores para um parque e data
 */
export async function processParkDayScore(
  parkId: string,
  date: string
): Promise<{ processed: number; errors: number }> {
  let processed = 0
  let errors = 0

  // Método 'calendar'
  try {
    const calendarScore = await calculateCalendarCrowdScore(parkId, date)
    if (calendarScore !== null) {
      await upsertParkDayScore({
        park_id: parkId,
        date,
        crowd_score: calendarScore,
        method: "calendar",
      })
      processed++
    }
  } catch (error) {
    console.error(`Error processing calendar score for ${parkId} ${date}:`, error)
    errors++
  }

  // Método 'computed'
  try {
    const computedScore = await calculateComputedCrowdScore(parkId, date)
    if (computedScore !== null) {
      await upsertParkDayScore({
        park_id: parkId,
        date,
        crowd_score: computedScore,
        method: "computed",
      })
      processed++
    }
  } catch (error) {
    console.error(`Error processing computed score for ${parkId} ${date}:`, error)
    errors++
  }

  // Método 'hybrid'
  try {
    const hybridScore = await calculateHybridCrowdScore(parkId, date)
    if (hybridScore !== null) {
      await upsertParkDayScore({
        park_id: parkId,
        date,
        crowd_score: hybridScore,
        method: "hybrid",
      })
      processed++
    }
  } catch (error) {
    console.error(`Error processing hybrid score for ${parkId} ${date}:`, error)
    errors++
  }

  return { processed, errors }
}

/**
 * Processa park_day_scores para um range de datas
 */
export async function processParkDayScoresForRange(
  parkId: string,
  startDate: string,
  endDate: string
): Promise<{ processed: number; errors: number }> {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  let totalProcessed = 0
  let totalErrors = 0

  const current = new Date(start)
  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0]
    const result = await processParkDayScore(parkId, dateStr)
    totalProcessed += result.processed
    totalErrors += result.errors

    current.setDate(current.getDate() + 1)
  }

  return { processed: totalProcessed, errors: totalErrors }
}

/**
 * Processa park_day_scores para próximos N dias
 */
export async function processParkDayScoresForUpcoming(
  parkId: string,
  daysAhead: number = 60
): Promise<{ processed: number; errors: number }> {
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + daysAhead)

  const startStr = start.toISOString().split("T")[0]
  const endStr = end.toISOString().split("T")[0]

  return processParkDayScoresForRange(parkId, startStr, endStr)
}
