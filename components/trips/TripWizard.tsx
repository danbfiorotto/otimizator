"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StepDates } from "./StepDates"
import { StepParks } from "./StepParks"
import { StepPreferences } from "./StepPreferences"
import { StepReview } from "./StepReview"
import { useCreateTrip } from "@/lib/hooks/useTrips"
import { useGroup } from "@/lib/hooks/useGroup"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

export type WizardData = {
  name: string
  startDate: string
  endDate: string
  destination: string
  selectedParks: string[]
  preferences: {
    restDays?: number
    avoidWeekendsFor?: string[]
    maxHeavyStreak?: number
    pace?: "relaxed" | "moderate" | "intense"
    hasKids?: boolean
    avoidWeekends?: boolean
    typicalArrivalTime?: "rope-drop" | "early" | "mid-morning" | "afternoon" | "flexible"
  }
}

const STEPS = [
  { id: "dates", title: "Datas" },
  { id: "parks", title: "Parques" },
  { id: "preferences", title: "Preferências" },
  { id: "review", title: "Revisão" },
]

export function TripWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<Partial<WizardData>>({
    destination: "Orlando",
    preferences: {},
  })
  const { mutate: createTrip, isPending } = useCreateTrip()
  const { data: group } = useGroup()
  const { toast } = useToast()
  const router = useRouter()

  const updateData = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    if (!data.name || !data.startDate || !data.endDate || !data.selectedParks?.length) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      })
      return
    }

    if (!group) {
      toast({
        title: "Erro",
        description: "Você precisa estar em um grupo para criar uma viagem",
        variant: "destructive",
      })
      router.push("/app/groups/join")
      return
    }

    createTrip(
      {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        destination: data.destination || "Orlando",
        preferences: {
          ...data.preferences,
          selectedParks: data.selectedParks, // Save selected parks in preferences
        },
      },
      {
        onSuccess: (trip) => {
          toast({
            title: "Sucesso",
            description: "Viagem criada com sucesso!",
          })
          // Redirect to calendar tab
          router.push(`/app/trips/${trip.id}?tab=calendar`)
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

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!(data.name && data.startDate && data.endDate)
      case 1:
        return !!(data.selectedParks && data.selectedParks.length > 0)
      case 2:
        return true
      case 3:
        return true
      default:
        return false
    }
  }

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Criar Nova Viagem</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Progress indicator */}
          <div className="mb-8 flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index <= currentStep
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="mt-2 text-sm text-muted-foreground">
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      index < currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="min-h-[400px]">
            {currentStep === 0 && (
              <StepDates data={data} updateData={updateData} />
            )}
            {currentStep === 1 && (
              <StepParks data={data} updateData={updateData} />
            )}
            {currentStep === 2 && (
              <StepPreferences data={data} updateData={updateData} />
            )}
            {currentStep === 3 && (
              <StepReview data={data as WizardData} onSubmit={handleSubmit} />
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            {currentStep < STEPS.length - 1 ? (
              <Button onClick={nextStep} disabled={!canProceed()}>
                Próximo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canProceed() || isPending}>
                {isPending ? "Criando..." : "Criar Viagem"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
