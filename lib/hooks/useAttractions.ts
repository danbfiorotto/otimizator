"use client"

import { useQuery } from "@tanstack/react-query"
import type { AttractionDTO } from "@/lib/dto/types"

async function fetchAttractions(parkId: string): Promise<AttractionDTO[]> {
  const res = await fetch(`/api/parks/${parkId}/attractions`)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(error.error || `Failed to fetch attractions: ${res.status}`)
  }
  return res.json()
}

export function useAttractions(parkId: string) {
  return useQuery({
    queryKey: ["attractions", parkId],
    queryFn: () => fetchAttractions(parkId),
    enabled: !!parkId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
}
