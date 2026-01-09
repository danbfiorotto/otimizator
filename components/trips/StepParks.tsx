"use client"

import { useParks } from "@/lib/hooks/useParks"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { WizardData } from "./TripWizard"

type Props = {
  data: Partial<WizardData>
  updateData: (updates: Partial<WizardData>) => void
}

export function StepParks({ data, updateData }: Props) {
  const { data: parks, isLoading, error, isError } = useParks()
  const selectedParks = data.selectedParks || []

  const togglePark = (parkId: string) => {
    const newSelected = selectedParks.includes(parkId)
      ? selectedParks.filter((id) => id !== parkId)
      : [...selectedParks, parkId]
    updateData({ selectedParks: newSelected })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Selecione os Parques</h3>
        <p className="text-sm text-muted-foreground">
          Carregando parques...
        </p>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    )
  }

  if (isError || error) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Selecione os Parques</h3>
        <p className="text-sm text-destructive text-center py-4">
          Erro ao carregar parques. Tente recarregar a página.
        </p>
      </div>
    )
  }

  if (!parks || parks.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Selecione os Parques</h3>
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum parque disponível no momento.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Selecione os Parques</h3>
      <p className="text-sm text-muted-foreground">
        Escolha os parques que deseja visitar nesta viagem
      </p>
      <div className="grid gap-4">
        {parks.map((park) => (
          <Card
            key={park.id}
            className={`cursor-pointer transition-colors ${
              selectedParks.includes(park.id)
                ? "border-primary bg-primary/5"
                : ""
            }`}
            onClick={() => togglePark(park.id)}
          >
            <CardContent className="flex items-center space-x-4 p-4">
              <Checkbox
                checked={selectedParks.includes(park.id)}
                onCheckedChange={() => togglePark(park.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <Label className="flex-1 cursor-pointer">
                {park.name}
              </Label>
            </CardContent>
          </Card>
        ))}
      </div>
      {selectedParks.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Selecione pelo menos um parque para continuar
        </p>
      )}
    </div>
  )
}
