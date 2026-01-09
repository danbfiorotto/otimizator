import { getSourceMapping, upsertParkCalendarDay } from "@/lib/db/queries"
import { fetchThemeParksSchedule, normalizeThemeParksSchedule } from "@/lib/connectors/themeParksWiki"
import { format, addDays } from "date-fns"

/**
 * Processa schedule do ThemeParks para um parque específico
 */
export async function processThemeParksScheduleForPark(
  parkId: string,
  themeparksEntityId: string,
  daysAhead: number = 60
): Promise<{ processed: number; errors: number }> {
  const today = new Date()
  const endDate = addDays(today, daysAhead)
  const startDateStr = format(today, "yyyy-MM-dd")
  const endDateStr = format(endDate, "yyyy-MM-dd")

  let processed = 0
  let errors = 0

  try {
    // Busca schedule do ThemeParks
    const schedule = await fetchThemeParksSchedule(themeparksEntityId, startDateStr, endDateStr)
    const normalized = normalizeThemeParksSchedule(schedule)

    // Processa cada dia do schedule
    for (const day of normalized) {
      try {
        // Só atualiza se tiver horários definidos
        if (day.openTime && day.closeTime) {
          await upsertParkCalendarDay({
            park_id: parkId,
            date: day.date,
            open_time_local: day.openTime,
            close_time_local: day.closeTime,
            raw: {
              source: "themeparks_wiki",
              entity_id: themeparksEntityId,
              updated_at: new Date().toISOString(),
            },
          })
          processed++
        }
      } catch (error) {
        console.error(`Error processing schedule day ${day.date} for park ${parkId}:`, error)
        errors++
      }
    }
  } catch (error) {
    console.error(`Error fetching schedule for park ${parkId} (entity ${themeparksEntityId}):`, error)
    errors++
  }

  return { processed, errors }
}

/**
 * Processa schedule do ThemeParks para todos os parques
 */
export async function processThemeParksScheduleForAllParks(
  parks: Array<{ id: string }>,
  daysAhead: number = 60
): Promise<{ processed: number; errors: number }> {
  let totalProcessed = 0
  let totalErrors = 0

  for (const park of parks) {
    try {
      // Busca mapping do ThemeParks
      const mapping = await getSourceMapping("themeparks_wiki", "park", park.id)
      if (!mapping) {
        // Parques sem mapping do ThemeParks são ignorados
        continue
      }

      const themeparksEntityId = mapping.source_id
      const result = await processThemeParksScheduleForPark(park.id, themeparksEntityId, daysAhead)
      totalProcessed += result.processed
      totalErrors += result.errors
    } catch (error) {
      console.error(`Error processing ThemeParks schedule for park ${park.id}:`, error)
      totalErrors++
    }
  }

  return { processed: totalProcessed, errors: totalErrors }
}
