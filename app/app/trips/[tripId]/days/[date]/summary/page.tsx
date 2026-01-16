"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDayPlan } from "@/lib/hooks/useDayPlan"
import { useTripDayAssignment } from "@/lib/hooks/useTripDayAssignment"
import { useParks } from "@/lib/hooks/useParks"
import { Skeleton } from "@/components/ui/skeleton"
import { safeFormatDate } from "@/lib/utils/time"
import { ptBR } from "date-fns/locale"
import { CheckCircle2, Clock, MapPin, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Props = {
  params: { tripId: string; date: string }
}

export default function DaySummaryPage({ params }: Props) {
  const { data: plan, isLoading: planLoading } = useDayPlan(params.tripId, params.date)
  const { data: assignment } = useTripDayAssignment(params.tripId, params.date)
  const { data: parks } = useParks()
  const router = useRouter()

  const park = parks?.find((p) => p.id === assignment?.parkId)

  if (planLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-32 mb-6" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Nenhum plano encontrado</h2>
          <p className="text-muted-foreground mb-4">
            Gere um plano primeiro na página de planejamento
          </p>
          <Button asChild>
            <Link href={`/app/trips/${params.tripId}/days/${params.date}`}>
              Ir para Planejamento
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const completedRides = plan.items.filter(
    (item) => item.type === "ride" && item.attractionId
  ).length

  const totalWaitTime = plan.metrics.totalExpectedWait || 0
  const totalWalkTime = plan.metrics.totalWalk || 0
  const totalPlannedRides = plan.metrics.totalPlannedRides || 0

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resumo do Dia</h1>
          <p className="text-muted-foreground mt-1">
            {safeFormatDate(params.date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {park && ` - ${park.name}`}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Voltar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Atrações Planejadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalPlannedRides}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {completedRides} com ID definido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tempo em Filas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalWaitTime}</div>
            <p className="text-sm text-muted-foreground mt-1">minutos estimados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Tempo de Caminhada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalWalkTime}</div>
            <p className="text-sm text-muted-foreground mt-1">minutos estimados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itinerário Completo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {plan.items.map((item, index) => (
              <div
                key={item.orderIndex}
                className="flex items-start gap-4 p-3 border rounded"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{item.type}</Badge>
                    <span className="font-semibold">{item.title}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span>{item.startTimeLocal}</span>
                    {item.endTimeLocal && (
                      <>
                        {" - "}
                        <span>{item.endTimeLocal}</span>
                      </>
                    )}
                    {item.expectedWait !== undefined && (
                      <>
                        {" • "}
                        <span>Fila: {item.expectedWait} min</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {plan.metrics.slackMinutes !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tempo Livre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plan.metrics.slackMinutes}</div>
            <p className="text-sm text-muted-foreground mt-1">minutos de folga no plano</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
