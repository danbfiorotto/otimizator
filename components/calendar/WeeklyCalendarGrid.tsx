"use client"

import { useMemo } from "react"
import { format, parseISO, startOfWeek, addDays, eachDayOfInterval, getDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DayColumn } from "./DayColumn"
import type { Trip } from "@/lib/hooks/useTrips"

type Props = {
  days: Date[]
  assignments: Record<string, { parkId: string | null; isLocked: boolean; score?: number; breakdown?: Record<string, number> }>
  onLockToggle: (date: string) => void
}

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

export function WeeklyCalendarGrid({ days, assignments, onLockToggle }: Props) {
  // Organize days into weeks (Monday to Sunday)
  const weeks = useMemo(() => {
    if (days.length === 0) return []

    const weeksArray: (Date | null)[][] = []
    let currentWeek: (Date | null)[] = []
    
    // Find the Monday of the first week
    const firstDay = days[0]
    const firstMonday = startOfWeek(firstDay, { weekStartsOn: 1 }) // 1 = Monday
    
    // Add empty cells for days before the first day (if first day is not Monday)
    if (firstDay.getTime() !== firstMonday.getTime()) {
      const daysBeforeStart = eachDayOfInterval({ 
        start: firstMonday, 
        end: addDays(firstDay, -1)
      })
      daysBeforeStart.forEach(d => currentWeek.push(d))
    }

    days.forEach((day) => {
      const dayOfWeek = getDay(day) === 0 ? 7 : getDay(day) // Convert Sunday (0) to 7
      
      // If it's Monday (1) and we have a week, start a new week
      if (dayOfWeek === 1 && currentWeek.length > 0) {
        // Fill remaining days of previous week with null
        while (currentWeek.length < 7) {
          currentWeek.push(null)
        }
        weeksArray.push(currentWeek)
        currentWeek = []
      }
      
      currentWeek.push(day)
    })

    // Fill the last week to 7 days
    while (currentWeek.length < 7) {
      currentWeek.push(null)
    }
    if (currentWeek.length > 0) {
      weeksArray.push(currentWeek)
    }

    return weeksArray
  }, [days])

  if (weeks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum dia disponível
      </div>
    )
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Header with week days - sticky on scroll */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2 sm:pb-3">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {WEEK_DAYS.map((dayName, index) => (
            <div
              key={dayName}
              className={`
                text-center text-xs sm:text-sm font-bold py-2 sm:py-3 px-1 sm:px-2 rounded-lg
                ${index >= 5 ? "bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300" : "bg-gradient-to-br from-primary/10 to-secondary/10 text-primary dark:text-primary-foreground"}
                border-2 border-transparent
              `}
            >
              {dayName}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar weeks - scrollable on mobile with better UX */}
      <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
        <div className="inline-block min-w-full sm:block">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1.5 sm:gap-2 min-w-[700px] sm:min-w-0">
          {week.map((day, dayIndex) => {
            if (!day) {
              return (
                <div
                  key={`empty-${dayIndex}`}
                  className="min-h-[140px] sm:min-h-[160px] lg:min-h-[200px] border-2 border-dashed border-muted rounded-lg bg-muted/20"
                />
              )
            }

            const dateStr = format(day, "yyyy-MM-dd")
            const assignment = assignments[dateStr]

            return (
              <DayColumn
                key={dateStr}
                date={day}
                assignment={assignment}
                onLockToggle={() => onLockToggle(dateStr)}
              />
            )
          })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
