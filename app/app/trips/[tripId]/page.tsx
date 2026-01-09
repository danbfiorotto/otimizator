"use client"

import { TripHeader } from "@/components/trips/TripHeader"
import { TripTabs } from "@/components/trips/TripTabs"
import { TripCalendar } from "@/components/calendar/TripCalendar"
import { useTrip } from "@/lib/hooks/useTrips"
import { useRouter, useSearchParams } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Suspense } from "react"

type Props = {
  params: { tripId: string }
}

export default function TripDetailsPage({ params }: Props) {
  return (
    <Suspense fallback={
      <div className="container py-8">
        <Skeleton className="h-32 mb-6" />
        <Skeleton className="h-96" />
      </div>
    }>
      <TripDetailsContent tripId={params.tripId} />
    </Suspense>
  )
}

function TripDetailsContent({ tripId }: { tripId: string }) {
  const { data: trip, isLoading } = useTrip(tripId)
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab") || "calendar"

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-32 mb-6" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!trip) {
    router.push("/app/trips")
    return null
  }

  return (
    <div className="container py-8">
      <TripHeader trip={trip} />
      <TripTabs tripId={tripId} defaultTab={tab}>
        {{
          calendar: <TripCalendar tripId={tripId} />,
        }}
      </TripTabs>
    </div>
  )
}
