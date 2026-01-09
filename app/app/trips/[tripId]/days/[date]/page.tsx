"use client"

import { useState } from "react"
import { DayHeader } from "@/components/day/DayHeader"
import { AttractionPicker } from "@/components/day/AttractionPicker"
import { DayPreferences } from "@/components/day/DayPreferences"
import { FixedWindowsManager } from "@/components/day/FixedWindowsManager"
import { GeneratePlanButton } from "@/components/day/GeneratePlanButton"
import { LiveModeBanner } from "@/components/day/LiveModeBanner"
import { useTrip } from "@/lib/hooks/useTrips"
import { useTripDayAssignment } from "@/lib/hooks/useTripDayAssignment"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import type { DayPlanRequest } from "@/lib/dto/types"

type Props = {
  params: { tripId: string; date: string }
}

export default function DayPlannerPage({ params }: Props) {
  const { data: trip, isLoading: tripLoading } = useTrip(params.tripId)
  const { data: assignment, isLoading: assignmentLoading } = useTripDayAssignment(
    params.tripId,
    params.date
  )
  const router = useRouter()

  const [mustDo, setMustDo] = useState<string[]>([])
  const [want, setWant] = useState<string[]>([])
  const [optional, setOptional] = useState<string[]>([])
  const [preferences, setPreferences] = useState({
    arrivalTime: "08:00",
    lunchWindow: { start: "12:30", end: "13:30" },
    walkMinutesDefault: 10,
    mode: "p80" as "p50" | "p80",
  })
  const [fixedItems, setFixedItems] = useState<DayPlanRequest["fixedItems"]>([])

  const parkId = assignment?.parkId || ""

  if (tripLoading || assignmentLoading || !trip) {
    return (
      <div className="container py-8">
        <Skeleton className="h-32 mb-6" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!parkId) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Nenhum parque atribuído</h2>
          <p className="text-muted-foreground mb-4">
            Atribua um parque a este dia no calendário antes de planejar
          </p>
        </div>
      </div>
    )
  }

  const handleSelectionChange = (
    newMustDo: string[],
    newWant: string[],
    newOptional: string[]
  ) => {
    setMustDo(newMustDo)
    setWant(newWant)
    setOptional(newOptional)
  }

  return (
    <div className="container py-8 space-y-6">
      <DayHeader parkId={parkId} date={params.date} />
      <LiveModeBanner />
      <div className="grid gap-6 md:grid-cols-2">
        <AttractionPicker
          parkId={parkId}
          onSelectionChange={handleSelectionChange}
        />
        <DayPreferences
          preferences={preferences}
          onPreferencesChange={setPreferences}
        />
      </div>
      <FixedWindowsManager fixedItems={fixedItems} onChange={setFixedItems} />
      <GeneratePlanButton
        tripId={params.tripId}
        date={params.date}
        planData={{
          parkId,
          arrivalTimeLocal: preferences.arrivalTime,
          lunchWindow: preferences.lunchWindow,
          walkMinutesDefault: preferences.walkMinutesDefault,
          mode: preferences.mode,
          mustDoAttractionIds: mustDo,
          wantAttractionIds: want,
          fixedItems: fixedItems && fixedItems.length > 0 ? fixedItems : undefined,
        }}
      />
    </div>
  )
}
