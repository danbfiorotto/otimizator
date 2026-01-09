import { NextRequest, NextResponse } from "next/server"
import { getParkCalendarDays } from "@/lib/db/queries"
import { getCalendarCache } from "@/lib/utils/cache"
import type { ParkCalendarDayDTO } from "@/lib/dto/types"

/**
 * GET /api/parks/[parkId]/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { parkId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const start = searchParams.get("start")
    const end = searchParams.get("end")

    if (!start || !end) {
      return NextResponse.json({ error: "start and end dates required" }, { status: 400 })
    }

    const calendarDays = await getCalendarCache(params.parkId, start, async () => {
      return await getParkCalendarDays(params.parkId, start, end)
    })

    const dtos: ParkCalendarDayDTO[] = calendarDays.map((day) => ({
      parkId: day.park_id,
      date: day.date,
      crowdPercent: day.crowd_percent ?? undefined,
      openTimeLocal: day.open_time_local ?? undefined,
      closeTimeLocal: day.close_time_local ?? undefined,
      earlyEntry:
        day.early_entry_start && day.early_entry_end
          ? {
              start: day.early_entry_start,
              end: day.early_entry_end,
            }
          : null,
      flags: {
        publicHoliday: day.is_public_holiday ?? undefined,
        rainyDay: day.is_rainy_day ?? undefined,
        ticketedEvent: day.has_ticketed_event ?? undefined,
        extendedEvening: day.has_extended_evening ?? undefined,
      },
      source: "queue_times_calendar", // TODO: detectar fonte real
    }))

    return NextResponse.json(dtos, {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    })
  } catch (error) {
    console.error("Error fetching calendar:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
