"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { DayPlanRequest, DayPlanResponse } from "@/lib/dto/types"

async function fetchDayPlan(
  tripId: string,
  date: string
): Promise<DayPlanResponse | null> {
  const res = await fetch(`/api/trips/${tripId}/days/${date}/plan`)
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error("Failed to fetch day plan")
  }
  return res.json()
}

async function createDayPlan(
  tripId: string,
  date: string,
  data: Omit<DayPlanRequest, "tripId" | "date">
): Promise<DayPlanResponse> {
  const res = await fetch(`/api/trips/${tripId}/days/${date}/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to create day plan")
  }
  return res.json()
}

export function useDayPlan(tripId: string, date: string) {
  return useQuery({
    queryKey: ["trips", tripId, "days", date, "plan"],
    queryFn: () => fetchDayPlan(tripId, date),
    enabled: !!tripId && !!date,
  })
}

export function useCreateDayPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      tripId,
      date,
      ...data
    }: DayPlanRequest) => createDayPlan(tripId, date, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["trips", data.tripId, "days", data.date, "plan"],
      })
    },
  })
}
