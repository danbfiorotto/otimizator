"use client"

import { useDroppable } from "@dnd-kit/core"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Lock, Unlock } from "lucide-react"
import { ParkCard } from "./ParkCard"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"

type Props = {
  date: Date
  assignment?: { 
    parkId: string | null
    isLocked: boolean
    score?: number
    breakdown?: Record<string, number>
  }
  onLockToggle?: () => void
}

export function DayColumn({ date, assignment, onLockToggle }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: format(date, "yyyy-MM-dd"),
  })

  const dayOfWeek = format(date, "EEE")
  const dayNumber = format(date, "d")
  const isLocked = assignment?.isLocked || false
  const hasPark = !!assignment?.parkId

  const isToday = format(new Date(), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
  const isWeekend = dayOfWeek === "sáb" || dayOfWeek === "dom"

  return (
    <div ref={setNodeRef} className="h-full min-w-[90px] sm:min-w-0">
      <Card 
        className={`
          h-full min-h-[140px] sm:min-h-[160px] lg:min-h-[200px] transition-all duration-200 hover:shadow-lg
          ${isOver ? "border-primary border-2 bg-gradient-to-br from-primary/10 to-primary/5 shadow-md scale-[1.02]" : ""}
          ${isLocked ? "border-amber-500 border-2 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900" : ""}
          ${isToday ? "ring-2 ring-primary ring-offset-1 sm:ring-offset-2" : ""}
          ${isWeekend ? "bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/30 dark:to-pink-950/30" : ""}
        `}
      >
        <CardHeader className="pb-2 sm:pb-3 px-2 sm:px-3 lg:px-4 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between gap-1">
            <CardTitle className={`text-xs sm:text-sm font-bold ${isToday ? "text-primary" : ""}`}>
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase block leading-tight">{dayOfWeek}</span>
              <span className="text-base sm:text-lg lg:text-xl block leading-tight font-extrabold">{dayNumber}</span>
            </CardTitle>
            {hasPark && onLockToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLockToggle}
                className="h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0"
                title={isLocked ? "Destravar dia" : "Travar dia"}
              >
                {isLocked ? (
                  <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                ) : (
                  <Unlock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 flex-1 flex flex-col">
          {hasPark ? (
            <SortableContext
              items={[assignment!.parkId!]}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5 sm:space-y-2 flex-1 flex flex-col">
                <div className="flex-shrink-0">
                  <ParkCard parkId={assignment!.parkId!} />
                </div>
                {assignment?.score !== undefined && (
                  <div className="text-[10px] sm:text-xs space-y-0.5 sm:space-y-1 flex-shrink-0">
                    <div className="font-semibold text-primary">
                      ⭐ {assignment.score.toFixed(1)}
                    </div>
                    {assignment.breakdown && (
                      <div className="text-muted-foreground space-y-0.5 hidden sm:block">
                        {assignment.breakdown.crowd !== undefined && (
                          <div className="text-xs">👥 {(assignment.breakdown.crowd * 100).toFixed(0)}%</div>
                        )}
                        {assignment.breakdown.weekend !== undefined && assignment.breakdown.weekend > 0 && (
                          <div className="text-amber-600 text-xs">⚠️ Weekend</div>
                        )}
                        {assignment.breakdown.travel !== undefined && assignment.breakdown.travel > 0 && (
                          <div className="text-amber-600 text-xs">✈️ Travel</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {isLocked && (
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 flex-shrink-0">
                    <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span className="hidden sm:inline">Travado</span>
                  </div>
                )}
              </div>
            </SortableContext>
          ) : (
            <div className="text-[10px] sm:text-xs text-muted-foreground text-center py-3 sm:py-6 lg:py-8 flex flex-col items-center justify-center gap-1 sm:gap-2 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20">
                <span className="text-xl sm:text-2xl lg:text-3xl">🎢</span>
              </div>
              <span className="hidden sm:inline text-xs">Arraste um parque aqui</span>
              <span className="sm:hidden text-[10px]">Arraste</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
