import * as cheerio from "cheerio"
import { upsertParkCalendarDay } from "@/lib/db/queries"
import { getSourceMapping } from "@/lib/db/queries"
import type { ParkCalendarDay } from "@/lib/db/schema"

const QUEUE_TIMES_BASE_URL = "https://queue-times.com"

interface CalendarDayData {
  date: string // YYYY-MM-DD
  crowdPercent: number | null
  openTime: string | null // HH:mm
  closeTime: string | null // HH:mm
  earlyEntryStart: string | null // HH:mm
  earlyEntryEnd: string | null // HH:mm
  hasTicketedEvent: boolean
  hasExtendedEvening: boolean
  isPublicHoliday: boolean
  isRainyDay: boolean
}

/**
 * Faz parse do HTML do crowd calendar do Queue-Times
 */
export async function scrapeQueueTimesCalendar(
  queueTimesParkId: number,
  year: number,
  month: number
): Promise<CalendarDayData[]> {
  const url = `${QUEUE_TIMES_BASE_URL}/parks/${queueTimesParkId}/calendar/${year}/${month}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch calendar: ${response.statusText}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  const days: CalendarDayData[] = []

  // Parse da tabela do calendário
  // Nota: estrutura HTML pode variar, ajustar conforme necessário
  $("table.calendar-table tbody tr").each((_, row) => {
    const $row = $(row)
    const dateCell = $row.find("td:first-child")
    const dateText = dateCell.text().trim()

    // Parse da data (formato pode variar)
    const dateMatch = dateText.match(/(\d{1,2})\/(\d{1,2})/)
    if (!dateMatch) return

    const day = parseInt(dateMatch[1], 10)
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`

    // Parse crowd percent
    const crowdCell = $row.find("td:nth-child(2)")
    const crowdText = crowdCell.text().trim()
    const crowdMatch = crowdText.match(/(\d+)%/)
    const crowdPercent = crowdMatch ? parseInt(crowdMatch[1], 10) : null

    // Parse horários
    const hoursCell = $row.find("td:nth-child(3)")
    const hoursText = hoursCell.text().trim()
    const hoursMatch = hoursText.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/)
    let openTime: string | null = null
    let closeTime: string | null = null
    if (hoursMatch) {
      openTime = `${hoursMatch[1].padStart(2, "0")}:${hoursMatch[2]}`
      closeTime = `${hoursMatch[3].padStart(2, "0")}:${hoursMatch[4]}`
    }

    // Parse early entry
    const earlyEntryCell = $row.find("td:nth-child(4)")
    const earlyEntryText = earlyEntryCell.text().trim()
    let earlyEntryStart: string | null = null
    let earlyEntryEnd: string | null = null
    if (earlyEntryText) {
      const earlyMatch = earlyEntryText.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/)
      if (earlyMatch) {
        earlyEntryStart = `${earlyMatch[1].padStart(2, "0")}:${earlyMatch[2]}`
        earlyEntryEnd = `${earlyMatch[3].padStart(2, "0")}:${earlyMatch[4]}`
      }
    }

    // Flags
    const flagsCell = $row.find("td:last-child")
    const flagsText = flagsCell.text().toLowerCase()
    const hasTicketedEvent = flagsText.includes("ticketed") || flagsText.includes("event")
    const hasExtendedEvening = flagsText.includes("extended") || flagsText.includes("evening")
    const isPublicHoliday = flagsText.includes("holiday")
    const isRainyDay = flagsText.includes("rainy") || flagsText.includes("rain")

    days.push({
      date,
      crowdPercent,
      openTime,
      closeTime,
      earlyEntryStart,
      earlyEntryEnd,
      hasTicketedEvent,
      hasExtendedEvening,
      isPublicHoliday,
      isRainyDay,
    })
  })

  return days
}

/**
 * Processa e salva dados do calendário para um parque
 */
export async function processQueueTimesCalendar(
  queueTimesParkId: number,
  year: number,
  month: number
): Promise<{ processed: number; errors: number }> {
  // Busca mapping do parque
  const mapping = await getSourceMapping("queue_times", "park", queueTimesParkId.toString())
  if (!mapping) {
    throw new Error(`Park mapping not found for Queue-Times ID: ${queueTimesParkId}`)
  }

  const parkId = mapping.internal_id

  // Faz scrape do calendário
  const days = await scrapeQueueTimesCalendar(queueTimesParkId, year, month)

  let processed = 0
  let errors = 0

  for (const dayData of days) {
    try {
      await upsertParkCalendarDay({
        park_id: parkId,
        date: dayData.date,
        crowd_percent: dayData.crowdPercent,
        open_time_local: dayData.openTime,
        close_time_local: dayData.closeTime,
        early_entry_start: dayData.earlyEntryStart,
        early_entry_end: dayData.earlyEntryEnd,
        has_ticketed_event: dayData.hasTicketedEvent,
        has_extended_evening: dayData.hasExtendedEvening,
        is_public_holiday: dayData.isPublicHoliday,
        is_rainy_day: dayData.isRainyDay,
        raw: {
          source: "queue_times_calendar",
          queue_times_park_id: queueTimesParkId,
          year,
          month,
        },
      })
      processed++
    } catch (error) {
      console.error(`Error processing calendar day ${dayData.date}:`, error)
      errors++
    }
  }

  return { processed, errors }
}

/**
 * Processa calendário para próximos N meses
 */
export async function processQueueTimesCalendarForMonths(
  queueTimesParkId: number,
  monthsAhead: number = 6
): Promise<{ processed: number; errors: number }> {
  const now = new Date()
  let totalProcessed = 0
  let totalErrors = 0

  for (let i = 0; i < monthsAhead; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth() + 1

    try {
      const result = await processQueueTimesCalendar(queueTimesParkId, year, month)
      totalProcessed += result.processed
      totalErrors += result.errors
    } catch (error) {
      console.error(`Error processing calendar for ${year}-${month}:`, error)
      totalErrors++
    }
  }

  return { processed: totalProcessed, errors: totalErrors }
}
