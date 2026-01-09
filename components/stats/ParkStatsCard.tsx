"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type ParkStat = {
  dow: number
  month: number
  crowdScore: number
}

type Props = {
  stats: ParkStat[]
  parkName: string
}

const DOW_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const MONTH_NAMES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
]

export function ParkStatsCard({ stats, parkName }: Props) {
  const getCrowdLabel = (score: number) => {
    if (score < 0.3) return "Baixo"
    if (score < 0.6) return "Médio"
    return "Alto"
  }

  const getCrowdVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score < 0.3) return "default"
    if (score < 0.6) return "secondary"
    return "destructive"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{parkName} - Estatísticas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Por Dia da Semana</h3>
            <div className="grid gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                const stat = stats.find((s) => s.dow === dow)
                if (!stat) return null
                return (
                  <div key={dow} className="flex items-center justify-between p-2 border rounded">
                    <span>{DOW_NAMES[dow]}</span>
                    <Badge variant={getCrowdVariant(stat.crowdScore)}>
                      {getCrowdLabel(stat.crowdScore)}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Por Mês</h3>
            <div className="grid gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
                const stat = stats.find((s) => s.month === month)
                if (!stat) return null
                return (
                  <div key={month} className="flex items-center justify-between p-2 border rounded">
                    <span>{MONTH_NAMES[month - 1]}</span>
                    <Badge variant={getCrowdVariant(stat.crowdScore)}>
                      {getCrowdLabel(stat.crowdScore)}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
