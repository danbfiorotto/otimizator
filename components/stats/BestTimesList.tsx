"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type BestTime = {
  attractionId: string
  attractionName: string
  hour: number
  p50: number
  p80: number
}

type Props = {
  bestTimes: BestTime[]
}

export function BestTimesList({ bestTimes }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Melhores Horários</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {bestTimes.slice(0, 10).map((time, index) => (
            <div key={time.attractionId} className="flex items-center justify-between p-3 border rounded">
              <div className="flex-1">
                <div className="font-medium">{time.attractionName}</div>
                <div className="text-sm text-muted-foreground">
                  {time.hour}:00 - P50: {time.p50}min, P80: {time.p80}min
                </div>
              </div>
              <Badge variant="secondary">#{index + 1}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
