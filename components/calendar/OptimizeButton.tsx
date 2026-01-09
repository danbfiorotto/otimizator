"use client"

import { Button } from "@/components/ui/button"
import { useOptimizeTrip } from "@/lib/hooks/useOptimizeTrip"
import { useTrip } from "@/lib/hooks/useTrips"
import { useToast } from "@/components/ui/use-toast"
import { Sparkles } from "lucide-react"
import { AlternativesModal } from "./AlternativesModal"
import { useState } from "react"
import type { TripOptimizeResponse } from "@/lib/dto/types"

type Props = {
  tripId: string
  onOptimizationComplete?: (assignments: Record<string, { parkId: string | null; isLocked: boolean }>) => void
}

export function OptimizeButton({ tripId, onOptimizationComplete }: Props) {
  const { mutate: optimize, isPending } = useOptimizeTrip()
  const { data: trip } = useTrip(tripId)
  const { toast } = useToast()
  const [alternatives, setAlternatives] = useState<TripOptimizeResponse | null>(null)

  const handleOptimize = () => {
    if (!trip) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar informações da viagem",
        variant: "destructive",
      })
      return
    }

    const selectedParks = (trip.preferences?.selectedParks as string[]) || []
    if (selectedParks.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um parque na viagem",
        variant: "destructive",
      })
      return
    }

    optimize(
      {
        tripId,
        parksToSchedule: selectedParks,
        constraints: {
          restDays: (trip.preferences?.restDays as number) || 0,
          avoidWeekendsFor: (trip.preferences?.avoidWeekends as boolean)
            ? selectedParks
            : undefined,
          maxHeavyStreak: (trip.preferences?.maxHeavyStreak as number) || 2,
        },
        weights: {
          crowd: 1,
          hours: 1,
          weekendPenalty: (trip.preferences?.avoidWeekends as boolean) ? 1.5 : 1,
          travelDayPenalty: 1,
        },
      },
      {
        onSuccess: (data) => {
          setAlternatives(data)
          toast({
            title: "Otimização concluída",
            description: "Veja as sugestões abaixo",
          })
        },
        onError: (error: Error) => {
          toast({
            title: "Erro",
            description: error.message,
            variant: "destructive",
          })
        },
      }
    )
  }

  const handleApplyPlan = (plan: TripOptimizeResponse["assignments"]) => {
    const assignments: Record<string, { parkId: string | null; isLocked: boolean }> = {}
    for (const assignment of plan) {
      assignments[assignment.date] = {
        parkId: assignment.parkId,
        isLocked: false,
      }
    }
    if (onOptimizationComplete) {
      onOptimizationComplete(assignments)
    }
    setAlternatives(null)
    toast({
      title: "Plano aplicado",
      description: "As atribuições foram atualizadas. Clique em 'Confirmar Calendário' para salvar.",
    })
  }

  return (
    <>
      <Button onClick={handleOptimize} disabled={isPending}>
        <Sparkles className="mr-2 h-4 w-4" />
        {isPending ? "Otimizando..." : "Otimizar"}
      </Button>
      {alternatives && (
        <AlternativesModal
          alternatives={alternatives}
          onClose={() => setAlternatives(null)}
          onApply={(plan) => handleApplyPlan(plan)}
        />
      )}
    </>
  )
}
