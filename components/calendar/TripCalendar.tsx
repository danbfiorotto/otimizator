"use client"

import { CalendarBoard } from "./CalendarBoard"
import { useTrip } from "@/lib/hooks/useTrips"
import { Skeleton } from "@/components/ui/skeleton"

type Props = {
  tripId: string
}

export function TripCalendar({ tripId }: Props) {
  const { data: trip, isLoading } = useTrip(tripId)

  if (isLoading || !trip) {
    return <Skeleton className="h-96" />
  }

  return <CalendarBoard tripId={tripId} trip={trip} />
}
