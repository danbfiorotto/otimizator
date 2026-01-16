"use client"

import { useTrips } from "@/lib/hooks/useTrips"
import { TripCard } from "./TripCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Plus } from "lucide-react"
import { isPast } from "date-fns"
import { safeParseDate } from "@/lib/utils/time"

export function TripList() {
  const { data: trips, isLoading } = useTrips()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    )
  }

  if (!trips || trips.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">Nenhuma viagem encontrada</h3>
        <p className="text-muted-foreground mb-4">
          Crie sua primeira viagem para começar a planejar
        </p>
        <Button asChild>
          <Link href="/app/trips/new">
            <Plus className="mr-2 h-4 w-4" />
            Nova Viagem
          </Link>
        </Button>
      </div>
    )
  }

  // Separate trips into future and past
  const now = new Date()
  const futureTrips = trips.filter((trip) => {
    const endDate = safeParseDate(trip.end_date)
    return endDate && endDate >= now
  })
  const pastTrips = trips.filter((trip) => {
    const endDate = safeParseDate(trip.end_date)
    return endDate && endDate < now
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Minhas Viagens</h2>
        <Button asChild>
          <Link href="/app/trips/new">
            <Plus className="mr-2 h-4 w-4" />
            Nova Viagem
          </Link>
        </Button>
      </div>
      
      <Tabs defaultValue="future" className="w-full">
        <TabsList>
          <TabsTrigger value="future">
            Futuras ({futureTrips.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Histórico ({pastTrips.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="future" className="mt-6">
          {futureTrips.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Nenhuma viagem futura. Crie uma nova viagem para começar!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {futureTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-6">
          {pastTrips.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Nenhuma viagem no histórico ainda.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pastTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
