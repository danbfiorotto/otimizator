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
    <div ref={setNodeRef} className="h-full">
      <Card 
        className={`
          h-full transition-all duration-200 hover:shadow-lg
          ${isOver ? "border-primary border-2 bg-gradient-to-br from-primary/10 to-primary/5 shadow-md scale-105" : ""}
          ${isLocked ? "border-amber-500 border-2 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900" : ""}
          ${isToday ? "ring-2 ring-primary ring-offset-2" : ""}
          ${isWeekend ? "bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/30 dark:to-pink-950/30" : ""}
        `}
      >
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className={`text-sm font-bold ${isToday ? "text-primary" : ""}`}>
              <span className="text-xs text-muted-foreground uppercase">{dayOfWeek}</span>
              <br />
              <span className="text-lg">{dayNumber}</span>
            </CardTitle>
            {hasPark && onLockToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLockToggle}
                className="h-6 w-6 p-0"
                title={isLocked ? "Destravar dia" : "Travar dia"}
              >
                {isLocked ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Unlock className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {hasPark ? (
            <SortableContext
              items={[assignment!.parkId!]}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                <ParkCard parkId={assignment!.parkId!} />
                {assignment?.score !== undefined && (
                  <div className="text-xs space-y-1">
                    <div className="font-semibold">
                      Score: {assignment.score.toFixed(2)}
                    </div>
                    {assignment.breakdown && (
                      <div className="text-muted-foreground space-y-0.5">
                        {assignment.breakdown.crowd !== undefined && (
                          <div>Crowd: {(assignment.breakdown.crowd * 100).toFixed(0)}%</div>
                        )}
                        {assignment.breakdown.weekend !== undefined && assignment.breakdown.weekend > 0 && (
                          <div className="text-amber-600">Weekend penalty</div>
                        )}
                        {assignment.breakdown.travel !== undefined && assignment.breakdown.travel > 0 && (
                          <div className="text-amber-600">Travel day</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {isLocked && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <Lock className="h-3 w-3" />
                    Travado
                  </div>
                )}
              </div>
            </SortableContext>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-8 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <span className="text-2xl">🎢</span>
              </div>
              <span>Arraste um parque aqui</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
