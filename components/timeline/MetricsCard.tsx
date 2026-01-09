"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { DayPlanResponse } from "@/lib/dto/types"

type Props = {
  metrics: DayPlanResponse["metrics"]
}

export function MetricsCard({ metrics }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Métricas do Plano</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm text-muted-foreground mb-1">Atrações Planejadas</div>
          <div className="text-2xl font-bold">{metrics.totalPlannedRides}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Tempo Total de Fila</div>
          <div className="text-2xl font-bold">{metrics.totalExpectedWait} min</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Tempo de Caminhada</div>
          <div className="text-2xl font-bold">{metrics.totalWalk} min</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Tempo Livre</div>
          <div className="text-2xl font-bold">{metrics.slackMinutes} min</div>
          <Badge
            variant={metrics.slackMinutes > 60 ? "default" : "destructive"}
            className="mt-2"
          >
            {metrics.slackMinutes > 60 ? "Bom" : "Apertado"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
