"use client"

import { useQuery } from "@tanstack/react-query"
import type { AttractionStatsHourDTO } from "@/lib/dto/types"

async function fetchParkStats(
  parkId: string
): Promise<AttractionStatsHourDTO[]> {
  const res = await fetch(`/api/parks/${parkId}/stats`)
  if (!res.ok) throw new Error("Failed to fetch stats")
  return res.json()
}

export function useParkStats(parkId: string) {
  return useQuery({
    queryKey: ["parks", parkId, "stats"],
    queryFn: () => fetchParkStats(parkId),
    enabled: !!parkId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  })
}
