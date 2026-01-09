"use client"

import { useQuery } from "@tanstack/react-query"
import type { ParkDTO } from "@/lib/dto/types"

async function fetchParks(): Promise<ParkDTO[]> {
  const res = await fetch("/api/parks")
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(error.error || `Failed to fetch parks: ${res.status}`)
  }
  return res.json()
}

export function useParks() {
  return useQuery({
    queryKey: ["parks"],
    queryFn: fetchParks,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
}

export function usePark(parkId: string) {
  return useQuery({
    queryKey: ["parks", parkId],
    queryFn: async () => {
      const res = await fetch(`/api/parks/${parkId}`)
      if (!res.ok) throw new Error("Failed to fetch park")
      return res.json() as Promise<ParkDTO>
    },
    enabled: !!parkId,
    staleTime: 5 * 60 * 1000,
  })
}
