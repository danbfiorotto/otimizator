"use client"

import { useQuery } from "@tanstack/react-query"

async function fetchTripDayAssignment(
  tripId: string,
  date: string
): Promise<{ parkId: string | null }> {
  const res = await fetch(`/api/trips/${tripId}/days/${date}/assignment`)
  if (!res.ok) {
    if (res.status === 404) return { parkId: null }
    throw new Error("Failed to fetch assignment")
  }
  return res.json()
}

export function useTripDayAssignment(tripId: string, date: string) {
  return useQuery({
    queryKey: ["trips", tripId, "days", date, "assignment"],
    queryFn: () => fetchTripDayAssignment(tripId, date),
    enabled: !!tripId && !!date,
  })
}
