"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ParkCard } from "./ParkCard"
import type { ParkDTO } from "@/lib/dto/types"

type Props = {
  parks: ParkDTO[]
}

const UNASSIGNED_COLUMN_ID = "unassigned-parks"

export function UnassignedParksColumn({ parks }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: UNASSIGNED_COLUMN_ID,
  })

  return (
    <div ref={setNodeRef} className="w-full lg:w-64 flex-shrink-0">
      <Card
        className={`
          transition-all duration-200 h-full min-h-[500px] lg:sticky lg:top-4
          ${isOver ? "border-primary border-2 bg-gradient-to-br from-primary/20 to-secondary/20 shadow-xl scale-[1.02]" : "border-2"}
          bg-gradient-to-br from-background to-muted/30
        `}
      >
        <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <span className="text-lg">🎪</span>
            Parques Sem Dia Alocado
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Arraste parques aqui para remover do calendário
          </p>
        </CardHeader>
        <CardContent>
          {parks.length > 0 ? (
            <SortableContext
              items={parks.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {parks.map((park) => (
                  <ParkCard key={park.id} parkId={park.id} />
                ))}
              </div>
            </SortableContext>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              Todos os parques estão alocados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
