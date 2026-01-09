"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useParks } from "@/lib/hooks/useParks"
import { format } from "date-fns"
import type { WizardData } from "./TripWizard"

type Props = {
  data: WizardData
  onSubmit: () => void
}

export function StepReview({ data, onSubmit }: Props) {
  const { data: parks } = useParks()
  const selectedParksData = parks?.filter((p) =>
    data.selectedParks.includes(p.id)
  )

  const startDate = data.startDate ? new Date(data.startDate) : null
  const endDate = data.endDate ? new Date(data.endDate) : null
  const daysDiff =
    startDate && endDate
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Revisão</h3>
      <p className="text-sm text-muted-foreground">
        Revise as informações antes de criar a viagem
      </p>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="font-medium">Nome: </span>
              {data.name}
            </div>
            <div>
              <span className="font-medium">Destino: </span>
              {data.destination}
            </div>
            <div>
              <span className="font-medium">Período: </span>
              {startDate &&
                endDate &&
                `${format(startDate, "dd/MM/yyyy")} - ${format(
                  endDate,
                  "dd/MM/yyyy"
                )}`}
            </div>
            <div>
              <span className="font-medium">Duração: </span>
              {daysDiff} {daysDiff === 1 ? "dia" : "dias"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parques Selecionados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedParksData?.map((park) => (
                <Badge key={park.id} variant="secondary">
                  {park.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferências</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="font-medium">Ritmo: </span>
              {data.preferences.pace === "relaxed"
                ? "Relaxado"
                : data.preferences.pace === "intense"
                ? "Intenso"
                : "Moderado"}
            </div>
            <div>
              <span className="font-medium">Dias de descanso: </span>
              {data.preferences.restDays || 0}
            </div>
            <div>
              <span className="font-medium">Máximo de dias pesados seguidos: </span>
              {data.preferences.maxHeavyStreak || 2}
            </div>
            <div>
              <span className="font-medium">Com crianças: </span>
              {data.preferences.hasKids ? "Sim" : "Não"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={onSubmit} size="lg">
          Criar Viagem
        </Button>
      </div>
    </div>
  )
}
