"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Calendar, MapPin, Settings } from "lucide-react"
import Link from "next/link"
import type { Trip } from "@/lib/hooks/useTrips"

type Props = {
  trip: Trip
}

export function TripHeader({ trip }: Props) {
  const startDate = new Date(trip.start_date)
  const endDate = new Date(trip.end_date)
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="border-b pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{trip.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(startDate, "dd/MM/yyyy")} - {format(endDate, "dd/MM/yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {trip.destination}
            </span>
            <Badge variant="secondary">{daysDiff} dias</Badge>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/app/trips/${trip.id}/settings`}>
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Link>
        </Button>
      </div>
    </div>
  )
}
