"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"

type Reliability = {
  attractionId: string
  attractionName: string
  openRate: number
  downtimeRate: number
}

type Props = {
  reliabilities: Reliability[]
}

export function ReliabilityList({ reliabilities }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atrações Mais Instáveis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reliabilities
            .sort((a, b) => b.downtimeRate - a.downtimeRate)
            .slice(0, 10)
            .map((rel) => (
              <div
                key={rel.attractionId}
                className="flex items-center justify-between p-3 border rounded"
              >
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {rel.attractionName}
                    {rel.downtimeRate > 0.2 && (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Taxa de abertura: {(rel.openRate * 100).toFixed(1)}%
                  </div>
                </div>
                <Badge variant={rel.downtimeRate > 0.2 ? "destructive" : "secondary"}>
                  {(rel.downtimeRate * 100).toFixed(1)}% downtime
                </Badge>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  )
}
