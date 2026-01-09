"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Calendar } from "lucide-react"
import { useParkCalendar } from "@/lib/hooks/useParkCalendar"
import { format, parseISO } from "date-fns"

type Props = {
  parkId: string
  date: string
}

export function DayHeader({ parkId, date }: Props) {
  const startDate = format(parseISO(date), "yyyy-MM-dd")
  const endDate = startDate
  const { data: calendarDays } = useParkCalendar(parkId, startDate, endDate)
  const calendarDay = calendarDays?.[0]

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Planejamento do Dia</h2>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(parseISO(date), "dd/MM/yyyy")}
              </span>
              {calendarDay?.openTimeLocal && calendarDay?.closeTimeLocal && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {calendarDay.openTimeLocal} - {calendarDay.closeTimeLocal}
                </span>
              )}
              {calendarDay?.crowdPercent !== undefined && (
                <Badge variant="secondary">
                  Crowd: {calendarDay.crowdPercent}%
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
