"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { Calendar, MapPin, Copy, MoreVertical } from "lucide-react"
import type { Trip } from "@/lib/hooks/useTrips"

type Props = {
  trip: Trip
}

export function TripCard({ trip }: Props) {
  const startDate = parseISO(trip.start_date)
  const endDate = parseISO(trip.end_date)
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  const { toast } = useToast()
  const router = useRouter()
  const [isDuplicating, setIsDuplicating] = useState(false)

  const handleDuplicate = async () => {
    setIsDuplicating(true)
    try {
      const res = await fetch(`/api/trips/${trip.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to duplicate trip")
      }

      const newTrip = await res.json()

      toast({
        title: "Viagem duplicada",
        description: `Viagem "${newTrip.name}" criada com sucesso`,
      })

      router.push(`/app/trips/${newTrip.id}`)
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível duplicar a viagem",
        variant: "destructive",
      })
    } finally {
      setIsDuplicating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>{trip.name}</CardTitle>
            <CardDescription className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(startDate, "dd/MM/yyyy")} - {format(endDate, "dd/MM/yyyy")}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {trip.destination}
              </span>
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate} disabled={isDuplicating}>
                <Copy className="mr-2 h-4 w-4" />
                {isDuplicating ? "Duplicando..." : "Duplicar Viagem"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{daysDiff} dias</Badge>
          <Button asChild variant="outline">
            <Link href={`/app/trips/${trip.id}`}>Ver Detalhes</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
