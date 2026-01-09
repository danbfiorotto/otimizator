"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, MapPin, AlertTriangle, CheckCircle2, XCircle, Lock, Unlock, GripVertical } from "lucide-react"
import type { DayPlanResponse, AttractionLiveDTO } from "@/lib/dto/types"

type Props = {
  item: DayPlanResponse["items"][0]
  liveData?: AttractionLiveDTO
  hasSuggestion?: boolean
  isFixed?: boolean
  onToggleFixed?: () => void
}

export function TimelineItem({ item, liveData, hasSuggestion, isFixed = false, onToggleFixed }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: item.orderIndex,
    disabled: isFixed,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const getTypeColor = (type: string) => {
    switch (type) {
      case "ride":
        return "default"
      case "show":
        return "secondary"
      case "meal":
        return "outline"
      default:
        return "outline"
    }
  }

  const isClosed = liveData && !liveData.isOpen
  const waitChanged = liveData && item.expectedWait !== undefined
    ? Math.abs(liveData.waitMinutes - item.expectedWait) > 10
    : false
  const waitImproved = liveData && item.expectedWait !== undefined
    ? liveData.waitMinutes < item.expectedWait - 10
    : false

  const borderColor = isClosed
    ? "border-destructive"
    : waitImproved
    ? "border-green-500"
    : hasSuggestion
    ? "border-amber-500"
    : ""

  return (
    <Card 
      ref={setNodeRef} 
      style={style}
      className={`${borderColor} ${isFixed ? "border-amber-500" : ""} ${isDragging ? "border-primary" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          {!isFixed && (
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-1">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          {isFixed && (
            <div className="mt-1">
              <Lock className="h-4 w-4 text-amber-500" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={getTypeColor(item.type)}>{item.type}</Badge>
              <span className="font-semibold">{item.title}</span>
              {onToggleFixed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleFixed}
                  className="h-6 w-6 p-0 ml-auto"
                  title={isFixed ? "Destravar horário" : "Fixar horário"}
                >
                  {isFixed ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    <Unlock className="h-3 w-3" />
                  )}
                </Button>
              )}
              {liveData && (
                <div className="flex items-center gap-1">
                  {isClosed ? (
                    <Badge variant="destructive" className="text-xs">
                      <XCircle className="h-3 w-3 mr-1" />
                      Fechada
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                      Aberta
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {item.startTimeLocal} - {item.endTimeLocal}
              </span>
              {item.expectedWait !== undefined && (
                <span className={waitChanged ? (waitImproved ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400") : ""}>
                  Fila: {liveData && !isClosed ? (
                    <>
                      <span className={waitImproved ? "line-through text-muted-foreground" : ""}>
                        {item.expectedWait} min
                      </span>
                      {waitChanged && (
                        <span className="ml-1 font-semibold">
                          → {liveData.waitMinutes} min
                        </span>
                      )}
                    </>
                  ) : (
                    `${item.expectedWait} min`
                  )}
                </span>
              )}
              {item.expectedWalk !== undefined && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {item.expectedWalk} min
                </span>
              )}
              {item.riskScore !== undefined && item.riskScore > 0.3 && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  Risco: {(item.riskScore * 100).toFixed(0)}%
                </span>
              )}
            </div>
            {item.explanation && item.explanation.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                {item.explanation.join(" • ")}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
