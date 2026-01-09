"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { DayPlanResponse } from "@/lib/dto/types"

async function replan(
  tripId: string,
  date: string
): Promise<DayPlanResponse> {
  const res = await fetch(`/api/trips/${tripId}/days/${date}/replan`, {
    method: "POST",
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to replan")
  }
  return res.json()
}

export function useReplan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, date }: { tripId: string; date: string }) =>
      replan(tripId, date),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["trips", data.tripId, "days", data.date, "plan"],
      })
    },
  })
}
