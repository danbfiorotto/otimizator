"use client"

import { useTrip } from "@/lib/hooks/useTrips"
import { BestTimesList } from "@/components/stats/BestTimesList"
import { ReliabilityList } from "@/components/stats/ReliabilityList"
import { ParkStatsCard } from "@/components/stats/ParkStatsCard"
import { Skeleton } from "@/components/ui/skeleton"

type Props = {
  params: { tripId: string }
}

export default function StatsPage({ params }: Props) {
  const { data: trip, isLoading } = useTrip(params.tripId)

  if (isLoading || !trip) {
    return (
      <div className="container py-8">
        <Skeleton className="h-96" />
      </div>
    )
  }

  // TODO: Fetch actual stats data from API
  const bestTimes: any[] = []
  const reliabilities: any[] = []
  const parkStats: any[] = []

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-bold">Estatísticas</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <BestTimesList bestTimes={bestTimes} />
        <ReliabilityList reliabilities={reliabilities} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {parkStats.map((stat) => (
          <ParkStatsCard key={stat.parkId} stats={stat.stats} parkName={stat.parkName} />
        ))}
      </div>
    </div>
  )
}
