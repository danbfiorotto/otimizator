"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useParks } from "@/lib/hooks/useParks"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { TripOptimizeResponse } from "@/lib/dto/types"

type Props = {
  alternatives: TripOptimizeResponse
  onClose: () => void
  onApply?: (assignments: TripOptimizeResponse["assignments"]) => void
}

export function AlternativesModal({ alternatives, onClose, onApply }: Props) {
  const { data: parks } = useParks()

  const getParkName = (parkId: string | null) => {
    if (!parkId) return "Livre"
    return parks?.find((p) => p.id === parkId)?.name || parkId
  }

  const handleApply = (assignments: TripOptimizeResponse["assignments"]) => {
    if (onApply) {
      onApply(assignments)
    }
    onClose()
  }

  return (
    <Dialog open={!!alternatives} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Planos de Otimização</DialogTitle>
          <DialogDescription>
            Escolha um dos planos sugeridos ou feche para continuar editando manualmente
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Plano A (Recomendado)</h3>
              <Button onClick={() => handleApply(alternatives.assignments)} size="sm">
                Aplicar
              </Button>
            </div>
            <div className="grid gap-2">
              {alternatives.assignments.map((assignment) => (
                <div
                  key={assignment.date}
                  className="flex items-center justify-between p-3 border rounded hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium min-w-[120px]">
                      {format(parseISO(assignment.date), "EEEE, dd/MM", { locale: ptBR })}
                    </span>
                    <Badge variant={assignment.parkId ? "default" : "outline"}>
                      {getParkName(assignment.parkId)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {assignment.breakdown && (
                      <div className="text-muted-foreground text-xs">
                        {assignment.breakdown.crowd !== undefined && (
                          <span>Crowd: {(assignment.breakdown.crowd * 100).toFixed(0)}%</span>
                        )}
                        {assignment.breakdown.weekend !== undefined &&
                          assignment.breakdown.weekend > 0 && (
                            <span className="ml-2 text-amber-600">Weekend</span>
                          )}
                      </div>
                    )}
                    <span className="text-muted-foreground font-medium">
                      Score: {assignment.score.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {alternatives.alternatives.map((alt, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{alt.name}</h3>
                <Button
                  onClick={() => handleApply(alt.assignments)}
                  size="sm"
                  variant="outline"
                >
                  Aplicar
                </Button>
              </div>
              <div className="grid gap-2">
                {alt.assignments.map((assignment) => (
                  <div
                    key={assignment.date}
                    className="flex items-center justify-between p-3 border rounded hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium min-w-[120px]">
                        {format(parseISO(assignment.date), "EEEE, dd/MM", { locale: ptBR })}
                      </span>
                      <Badge variant={assignment.parkId ? "default" : "outline"}>
                        {getParkName(assignment.parkId)}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">
                      Score: {assignment.score.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
