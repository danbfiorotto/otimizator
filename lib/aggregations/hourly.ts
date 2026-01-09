import { createServiceClient } from "@/lib/db/supabaseServer"
import {
  getLatestWaitSamples,
  upsertAttractionHourStats,
  getAttractionsByPark,
} from "@/lib/db/queries"
import type { WaitSample } from "@/lib/db/schema"

const ROLLING_WEEKS = 12 // Janela de 12 semanas para cálculos

/**
 * Calcula percentis de um array de números
 */
function calculatePercentiles(values: number[], percentiles: number[]): Record<number, number> {
  const sorted = [...values].sort((a, b) => a - b)
  const result: Record<number, number> = {}

  for (const p of percentiles) {
    const index = Math.ceil((p / 100) * sorted.length) - 1
    result[p] = sorted[Math.max(0, index)] || 0
  }

  return result
}

/**
 * Calcula estatísticas por hora para uma atração
 */
export async function calculateAttractionHourStats(
  attractionId: string,
  month: number,
  dow: number,
  hour: number
): Promise<{
  p50: number | null
  p80: number | null
  p95: number | null
  openRate: number | null
  sampleCount: number
}> {
  const supabase = createServiceClient()

  // Calcula data de corte (12 semanas atrás)
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - ROLLING_WEEKS * 7)

  // Busca amostras no período, filtradas por mês, DOW e hora
  const { data: samples, error } = await supabase
    .from("wait_samples")
    .select("*")
    .eq("attraction_id", attractionId)
    .gte("sampled_at", cutoffDate.toISOString())
    .order("sampled_at", { ascending: false })

  if (error) {
    throw error
  }

  if (!samples || samples.length === 0) {
    return {
      p50: null,
      p80: null,
      p95: null,
      openRate: null,
      sampleCount: 0,
    }
  }

  // Filtra por mês, DOW e hora
  const filteredSamples = samples.filter((sample) => {
    const date = new Date(sample.sampled_at)
    const sampleMonth = date.getMonth() + 1
    const sampleDow = date.getDay()
    const sampleHour = date.getHours()

    return sampleMonth === month && sampleDow === dow && sampleHour === hour
  })

  if (filteredSamples.length === 0) {
    return {
      p50: null,
      p80: null,
      p95: null,
      openRate: null,
      sampleCount: 0,
    }
  }

  // Calcula open rate
  const openCount = filteredSamples.filter((s) => s.is_open).length
  const openRate = openCount / filteredSamples.length

  // Calcula percentis apenas para amostras abertas
  const waitTimes = filteredSamples.filter((s) => s.is_open).map((s) => s.wait_minutes)

  let p50: number | null = null
  let p80: number | null = null
  let p95: number | null = null

  if (waitTimes.length > 0) {
    const percentiles = calculatePercentiles(waitTimes, [50, 80, 95])
    p50 = percentiles[50]
    p80 = percentiles[80]
    p95 = percentiles[95]
  }

  return {
    p50,
    p80,
    p95,
    openRate,
    sampleCount: filteredSamples.length,
  }
}

/**
 * Processa agregações hourly para todas as atrações
 */
export async function processHourlyAggregations(
  parkId?: string
): Promise<{ processed: number; errors: number }> {
  const supabase = createServiceClient()
  let processed = 0
  let errors = 0

  // Busca atrações
  let attractions: Array<{ id: string; park_id: string }>

  if (parkId) {
    const parkAttractions = await getAttractionsByPark(parkId)
    attractions = parkAttractions.map((a) => ({ id: a.id, park_id: a.park_id }))
  } else {
    const { data, error } = await supabase
      .from("attractions")
      .select("id, park_id")
      .eq("is_archived", false)

    if (error) throw error
    attractions = data || []
  }

  // Processa cada atração para todos os meses, DOWs e horas
  for (const attraction of attractions) {
    try {
      for (let month = 1; month <= 12; month++) {
        for (let dow = 0; dow <= 6; dow++) {
          for (let hour = 0; hour <= 23; hour++) {
            const stats = await calculateAttractionHourStats(attraction.id, month, dow, hour)

            if (stats.sampleCount > 0) {
              await upsertAttractionHourStats({
                attraction_id: attraction.id,
                month,
                dow,
                hour,
                p50: stats.p50,
                p80: stats.p80,
                p95: stats.p95,
                open_rate: stats.openRate,
                sample_count: stats.sampleCount,
              })
              processed++
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error processing hourly stats for attraction ${attraction.id}:`, error)
      errors++
    }
  }

  return { processed, errors }
}
