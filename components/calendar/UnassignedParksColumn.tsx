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
    <div className="w-64 flex-shrink-0">
      <Card
        ref={setNodeRef}
        className={isOver ? "border-primary bg-primary/5" : ""}
      >
        <CardHeader>
          <CardTitle className="text-sm">
            Parques Sem Dia Alocado
          </CardTitle>
          <p className="text-xs text-muted-foreground">
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
