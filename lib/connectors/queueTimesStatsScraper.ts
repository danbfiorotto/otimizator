import * as cheerio from "cheerio"

const QUEUE_TIMES_BASE_URL = "https://queue-times.com"

interface ParkStats {
  crowdByMonth: Record<number, number> // month (1-12) -> crowd %
  crowdByDOW: Record<number, number> // dow (0-6) -> crowd %
  topRides: Array<{
    name: string
    averageWait: number
  }>
}

/**
 * Faz scrape das estatísticas do parque
 */
export async function scrapeQueueTimesStats(
  queueTimesParkId: number,
  year?: number
): Promise<ParkStats> {
  const url = year
    ? `${QUEUE_TIMES_BASE_URL}/parks/${queueTimesParkId}/stats/${year}`
    : `${QUEUE_TIMES_BASE_URL}/parks/${queueTimesParkId}/stats`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  const stats: ParkStats = {
    crowdByMonth: {},
    crowdByDOW: {},
    topRides: [],
  }

  // Parse crowd by month
  $("table.stats-month tbody tr").each((_, row) => {
    const $row = $(row)
    const monthCell = $row.find("td:first-child")
    const crowdCell = $row.find("td:last-child")
    const monthText = monthCell.text().trim()
    const crowdText = crowdCell.text().trim()

    const monthMatch = monthText.match(/(\d+)/)
    const crowdMatch = crowdText.match(/(\d+)%/)
    if (monthMatch && crowdMatch) {
      const month = parseInt(monthMatch[1], 10)
      const crowd = parseInt(crowdMatch[1], 10)
      stats.crowdByMonth[month] = crowd
    }
  })

  // Parse crowd by day of week
  $("table.stats-dow tbody tr").each((_, row) => {
    const $row = $(row)
    const dowCell = $row.find("td:first-child")
    const crowdCell = $row.find("td:last-child")
    const dowText = dowCell.text().trim().toLowerCase()
    const crowdText = crowdCell.text().trim()

    const dowMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    }

    const dow = dowMap[dowText]
    const crowdMatch = crowdText.match(/(\d+)%/)
    if (dow !== undefined && crowdMatch) {
      const crowd = parseInt(crowdMatch[1], 10)
      stats.crowdByDOW[dow] = crowd
    }
  })

  // Parse top rides
  $("table.stats-rides tbody tr").each((_, row) => {
    const $row = $(row)
    const nameCell = $row.find("td:first-child")
    const avgCell = $row.find("td:last-child")
    const name = nameCell.text().trim()
    const avgText = avgCell.text().trim()

    const avgMatch = avgText.match(/(\d+)/)
    if (name && avgMatch) {
      stats.topRides.push({
        name,
        averageWait: parseInt(avgMatch[1], 10),
      })
    }
  })

  return stats
}

/**
 * Processa e armazena estatísticas (pode ser usado para calcular park_day_scores)
 */
export async function processQueueTimesStats(
  queueTimesParkId: number,
  year?: number
): Promise<ParkStats> {
  return scrapeQueueTimesStats(queueTimesParkId, year)
}
