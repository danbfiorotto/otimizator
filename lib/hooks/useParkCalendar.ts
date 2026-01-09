"use client"

import { useQuery } from "@tanstack/react-query"
import type { ParkCalendarDayDTO } from "@/lib/dto/types"

async function fetchParkCalendar(
  parkId: string,
  start: string,
  end: string
): Promise<ParkCalendarDayDTO[]> {
  const res = await fetch(
    `/api/parks/${parkId}/calendar?start=${start}&end=${end}`
  )
  if (!res.ok) throw new Error("Failed to fetch calendar")
  return res.json()
}

export function useParkCalendar(
  parkId: string,
  start: string,
  end: string
) {
  return useQuery({
    queryKey: ["parks", parkId, "calendar", start, end],
    queryFn: () => fetchParkCalendar(parkId, start, end),
    enabled: !!parkId && !!start && !!end,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
  })
}
