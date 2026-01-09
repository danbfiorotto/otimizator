"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export type Trip = {
  id: string
  group_id: string
  name: string
  start_date: string
  end_date: string
  destination: string
  preferences: Record<string, unknown>
  created_at: string
}

async function fetchTrips(): Promise<Trip[]> {
  const res = await fetch("/api/trips")
  if (!res.ok) throw new Error("Failed to fetch trips")
  return res.json()
}

async function fetchTrip(tripId: string): Promise<Trip> {
  const res = await fetch(`/api/trips/${tripId}`)
  if (!res.ok) throw new Error("Failed to fetch trip")
  return res.json()
}

async function createTrip(data: {
  name: string
  startDate: string
  endDate: string
  destination?: string
  preferences?: Record<string, unknown>
}): Promise<Trip> {
  const res = await fetch("/api/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to create trip")
  }
  return res.json()
}

export function useTrips() {
  return useQuery({
    queryKey: ["trips"],
    queryFn: fetchTrips,
  })
}

export function useTrip(tripId: string) {
  return useQuery({
    queryKey: ["trips", tripId],
    queryFn: () => fetchTrip(tripId),
    enabled: !!tripId,
  })
}

export function useCreateTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] })
    },
  })
}

async function deleteTrip(tripId: string): Promise<void> {
  const res = await fetch(`/api/trips/${tripId}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to delete trip")
  }
}

export function useDeleteTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] })
    },
  })
}