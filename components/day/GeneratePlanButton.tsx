"use client"

import { Button } from "@/components/ui/button"
import { useCreateDayPlan } from "@/lib/hooks/useDayPlan"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import type { DayPlanRequest } from "@/lib/dto/types"

type Props = {
  tripId: string
  date: string
  planData: Omit<DayPlanRequest, "tripId" | "date">
}

export function GeneratePlanButton({ tripId, date, planData }: Props) {
  const { mutate: createPlan, isPending } = useCreateDayPlan()
  const { toast } = useToast()
  const router = useRouter()

  const handleGenerate = () => {
    createPlan(
      {
        tripId,
        date,
        ...planData,
      },
      {
        onSuccess: () => {
          toast({
            title: "Plano gerado",
            description: "Seu plano do dia foi criado com sucesso!",
          })
          router.push(`/app/trips/${tripId}/days/${date}/plan`)
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

  return (
    <Button onClick={handleGenerate} disabled={isPending} size="lg" className="w-full">
      <Sparkles className="mr-2 h-4 w-4" />
      {isPending ? "Gerando plano..." : "Gerar Plano"}
    </Button>
  )
}
