"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTrip } from "@/lib/hooks/useTrips"
import { useParks } from "@/lib/hooks/useParks"
import { format, parseISO } from "date-fns"
import { useParkCalendar } from "@/lib/hooks/useParkCalendar"
import { Info } from "lucide-react"

type Props = {
  tripId: string
  assignments: Record<string, { parkId: string | null; isLocked: boolean }>
}

export function SuggestionsSidebar({ tripId, assignments }: Props) {
  const { data: trip } = useTrip(tripId)
  const { data: parks } = useParks()

  if (!trip) return null

  const startDate = format(parseISO(trip.start_date), "yyyy-MM-dd")
  const endDate = format(parseISO(trip.end_date), "yyyy-MM-dd")

  // Get assignments with park info and scores
  const assignmentsWithInfo = Object.entries(assignments)
    .filter(([_, assignment]) => assignment.parkId)
    .map(([date, assignment]) => {
      const park = parks?.find((p) => p.id === assignment.parkId)
      return {
        date,
        park,
        isLocked: assignment.isLocked,
      }
    })
    .filter((item) => item.park)

  return (
    <div className="w-80">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sugestões e Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignmentsWithInfo.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Arraste parques para os dias ou clique em "Otimizar" para sugestões automáticas
            </p>
          ) : (
            <div className="space-y-3">
              {assignmentsWithInfo.map((item) => (
                <div key={item.date} className="border rounded p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">
                      {format(parseISO(item.date), "dd/MM")}
                    </span>
                    {item.isLocked && (
                      <Badge variant="outline" className="text-xs">
                        Travado
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm font-semibold">{item.park?.name}</div>
                  <ParkDayInfo parkId={item.park!.id} date={item.date} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ParkDayInfo({ parkId, date }: { parkId: string; date: string }) {
  const { data: calendarDays } = useParkCalendar(parkId, date, date)
  const calendarDay = calendarDays?.[0]

  if (!calendarDay) return null

  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      {calendarDay.openTimeLocal && calendarDay.closeTimeLocal && (
        <div className="flex items-center gap-1">
          <Info className="h-3 w-3" />
          <span>
            {calendarDay.openTimeLocal} - {calendarDay.closeTimeLocal}
          </span>
        </div>
      )}
      {calendarDay.crowdPercent !== undefined && (
        <div>
          <span className="font-medium">Crowd: </span>
          <Badge
            variant={
              calendarDay.crowdPercent < 50
                ? "default"
                : calendarDay.crowdPercent < 75
                ? "secondary"
                : "destructive"
            }
            className="text-xs"
          >
            {calendarDay.crowdPercent}%
          </Badge>
        </div>
      )}
      {calendarDay.flags.publicHoliday && (
        <Badge variant="outline" className="text-xs">
          Feriado
        </Badge>
      )}
    </div>
  )
}
