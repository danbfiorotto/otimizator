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
      className={isDragging ? "border-primary" : ""}
    >
      <CardContent className="p-3 flex items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm">{park.name}</div>
        </div>
        <Badge variant="outline" className="text-xs">
          {park.slug}
        </Badge>
      </CardContent>
    </Card>
  )
}
