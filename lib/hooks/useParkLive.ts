"use client"

import { useQuery } from "@tanstack/react-query"
import type { AttractionLiveDTO } from "@/lib/dto/types"

async function fetchParkLive(
  parkId: string
): Promise<AttractionLiveDTO[]> {
  const res = await fetch(`/api/parks/${parkId}/live`)
  if (!res.ok) throw new Error("Failed to fetch live data")
  return res.json()
}

export function useParkLive(parkId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["parks", parkId, "live"],
    queryFn: () => fetchParkLive(parkId),
    enabled: !!parkId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Poll every 5 minutes
  })
}
