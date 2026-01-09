"use client"

import { useMutation } from "@tanstack/react-query"
import type { TripOptimizeRequest, TripOptimizeResponse } from "@/lib/dto/types"

async function optimizeTrip(
  tripId: string,
  data: Omit<TripOptimizeRequest, "tripId">
): Promise<TripOptimizeResponse> {
  const res = await fetch(`/api/trips/${tripId}/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to optimize trip")
  }
  return res.json()
}

export function useOptimizeTrip() {
  return useMutation({
    mutationFn: ({ tripId, ...data }: TripOptimizeRequest) =>
      optimizeTrip(tripId, data),
  })
}
