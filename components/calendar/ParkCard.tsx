"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GripVertical } from "lucide-react"
import { useParks } from "@/lib/hooks/useParks"

type Props = {
  parkId: string
}

export function ParkCard({ parkId }: Props) {
  const { data: parks } = useParks()
  const park = parks?.find((p) => p.id === parkId)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: parkId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (!park) return null

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`
        transition-all duration-200 hover:shadow-lg hover:scale-105
        ${isDragging ? "border-primary border-2 shadow-xl scale-110 rotate-2" : "border-2"}
        bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10
        hover:from-primary/20 hover:via-secondary/20 hover:to-accent/20
      `}
    >
      <CardContent className="p-2 sm:p-2.5 lg:p-3 flex items-center gap-1.5 sm:gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing flex-shrink-0">
          <div className="p-0.5 sm:p-1 rounded hover:bg-primary/20 transition-colors">
            <GripVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-xs sm:text-sm lg:text-base text-foreground line-clamp-2 leading-tight" title={park.name}>
            {park.name}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
