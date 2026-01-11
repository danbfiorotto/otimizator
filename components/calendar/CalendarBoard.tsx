"use client"

import { useState, useEffect, useMemo } from "react"
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core"
import { WeeklyCalendarGrid } from "./WeeklyCalendarGrid"
import { OptimizeButton } from "./OptimizeButton"
import { UnassignedParksColumn } from "./UnassignedParksColumn"
import { Button } from "@/components/ui/button"
import { useTrip } from "@/lib/hooks/useTrips"
import { useParks } from "@/lib/hooks/useParks"
import { format, eachDayOfInterval, parseISO } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import { Check } from "lucide-react"
import type { Trip } from "@/lib/hooks/useTrips"

type Props = {
  tripId: string
  trip: Trip
}

export function CalendarBoard({ tripId, trip }: Props) {
  const [assignments, setAssignments] = useState<
    Record<string, { parkId: string | null; isLocked: boolean; score?: number; breakdown?: Record<string, number> }>
  >({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [calculatingScores, setCalculatingScores] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const { data: parks } = useParks()

  const days = useMemo(() => {
    const startDate = parseISO(trip.start_date)
    const endDate = parseISO(trip.end_date)
    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [trip.start_date, trip.end_date])
  
  // Memoize selected parks to avoid unnecessary re-renders
  const selectedParkIds = useMemo(() => {
    return (trip.preferences?.selectedParks as string[]) || []
  }, [trip.preferences?.selectedParks])
  
  // Get selected parks from trip preferences
  const selectedParks = parks?.filter((p) => selectedParkIds.includes(p.id)) || []
  
  // Get parks that are not yet assigned
  const assignedParkIds = new Set(
    Object.values(assignments)
      .map((a) => a.parkId)
      .filter((id): id is string => id !== null)
  )
  const unassignedParks = selectedParks.filter((p) => !assignedParkIds.has(p.id))

  // Load existing assignments immediately (don't wait for optimization)
  useEffect(() => {
    let cancelled = false
    
    const loadAssignments = async () => {
      setIsLoading(true)
      try {
        // Load all assignments in parallel for faster loading
        const assignmentPromises = days.map(async (day) => {
          const dateStr = format(day, "yyyy-MM-dd")
          try {
            const res = await fetch(`/api/trips/${tripId}/days/${dateStr}/assignment`)
            if (res.ok) {
              const data = await res.json()
              return { dateStr, data }
            }
          } catch (error) {
            console.error(`Error loading assignment for ${dateStr}:`, error)
          }
          return { dateStr, data: { parkId: null, isLocked: false } }
        })
        
        const results = await Promise.all(assignmentPromises)
        
        if (cancelled) return
        
        const assignmentsData: Record<string, { parkId: string | null; isLocked: boolean }> = {}
        let hasAnyAssignment = false
        
        for (const { dateStr, data } of results) {
          if (data.parkId) {
            hasAnyAssignment = true
          }
          assignmentsData[dateStr] = {
            parkId: data.parkId || null,
            isLocked: data.isLocked || false,
          }
        }
        
        setAssignments(assignmentsData)
        setIsLoading(false) // Show calendar immediately with saved data
        
        // Auto-optimize in background if no assignments exist (don't block UI)
        if (!hasAnyAssignment && selectedParkIds.length > 0) {
          // Run optimization in background without blocking
          fetch(`/api/trips/${tripId}/optimize?autoSave=true`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              parksToSchedule: selectedParkIds,
              constraints: {
                restDays: trip.preferences?.restDays,
                avoidWeekendsFor: trip.preferences?.avoidWeekends ? selectedParkIds : undefined,
                maxHeavyStreak: trip.preferences?.maxHeavyStreak,
              },
              weights: {
                crowd: 1,
                hours: 1,
                weekendPenalty: trip.preferences?.avoidWeekends ? 1.5 : 1,
                travelDayPenalty: 1,
              },
            }),
          })
            .then(async (optimizeRes) => {
              if (cancelled) return
              
              if (optimizeRes.ok) {
                const optimizeData = await optimizeRes.json()
                // Update UI with optimized assignments
                const optimizedAssignments: Record<string, { parkId: string | null; isLocked: boolean }> = {}
                for (const assignment of optimizeData.assignments) {
                  optimizedAssignments[assignment.date] = {
                    parkId: assignment.parkId,
                    isLocked: false,
                  }
                }
                setAssignments(optimizedAssignments)
                
                toast({
                  title: "Otimização concluída",
                  description: "Plano A foi aplicado automaticamente. Você pode ajustar conforme necessário.",
                })
              }
            })
            .catch((error) => {
              console.error("Error auto-optimizing:", error)
              // Don't show error toast for auto-optimization failure
            })
        }
      } catch (error) {
        console.error("Error loading assignments:", error)
        setIsLoading(false)
      }
    }

    loadAssignments()
    
    return () => {
      cancelled = true
    }
  }, [tripId, days, selectedParkIds, trip.preferences?.restDays, trip.preferences?.avoidWeekends, trip.preferences?.maxHeavyStreak, toast])

  const calculateScore = async (parkId: string, date: string) => {
    if (calculatingScores.has(`${parkId}-${date}`)) return

    setCalculatingScores((prev) => new Set(prev).add(`${parkId}-${date}`))
    
    try {
      const res = await fetch(`/api/trips/${tripId}/days/${date}/score?parkId=${parkId}`)
      if (res.ok) {
        const scoreData = await res.json()
        setAssignments((prev) => ({
          ...prev,
          [date]: {
            ...prev[date],
            parkId,
            score: scoreData.score,
            breakdown: scoreData.breakdown,
          },
        }))
      }
    } catch (error) {
      console.error("Error calculating score:", error)
    } finally {
      setCalculatingScores((prev) => {
        const newSet = new Set(prev)
        newSet.delete(`${parkId}-${date}`)
        return newSet
      })
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    try {
      const parkId = active.id as string
      const targetId = over.id as string

      // Special ID for unassigned parks column
      const UNASSIGNED_COLUMN_ID = "unassigned-parks"

      // If dropping in unassigned column, remove from all days
      if (targetId === UNASSIGNED_COLUMN_ID) {
        setAssignments((prev) => {
          const newAssignments = { ...prev }
          // Find and remove park from all days
          Object.keys(newAssignments).forEach((date) => {
            const assignment = newAssignments[date]
            if (assignment && assignment.parkId === parkId) {
              newAssignments[date] = {
                parkId: null,
                isLocked: assignment.isLocked || false,
                score: undefined,
                breakdown: undefined,
              }
            }
          })
          return newAssignments
        })
        return
      }

    // Target is a date
    const targetDate = targetId

    // Don't allow dragging to locked days
    if (assignments[targetDate]?.isLocked) {
      toast({
        title: "Dia travado",
        description: "Este dia está travado e não pode ser modificado",
        variant: "destructive",
      })
      return
    }

      setAssignments((prev) => {
        const newAssignments = { ...prev }
        
        // Remove park from previous day (if any)
        Object.keys(newAssignments).forEach((date) => {
          const assignment = newAssignments[date]
          if (assignment && assignment.parkId === parkId && date !== targetDate) {
            newAssignments[date] = {
              parkId: null,
              isLocked: assignment.isLocked || false,
              score: undefined,
              breakdown: undefined,
            }
          }
        })

        // Assign park to target date
        const existingAssignment = prev[targetDate]
        newAssignments[targetDate] = {
          parkId,
          isLocked: existingAssignment?.isLocked || false,
          score: undefined,
          breakdown: undefined,
        }

        return newAssignments
      })

      // Calculate score in real-time
      calculateScore(parkId, targetDate)
    } catch (error) {
      console.error("Error in handleDragEnd:", error)
      toast({
        title: "Erro",
        description: "Não foi possível mover o parque. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleConfirmCalendar = async () => {
    setIsSaving(true)
    try {
      const savePromises = days.map(async (day) => {
        const dateStr = format(day, "yyyy-MM-dd")
        const assignment = assignments[dateStr] || { parkId: null, isLocked: false }
        
        const res = await fetch(`/api/trips/${tripId}/days/${dateStr}/assignment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parkId: assignment.parkId,
            isLocked: assignment.isLocked,
          }),
        })

        if (!res.ok) {
          throw new Error(`Failed to save assignment for ${dateStr}`)
        }
      })

      await Promise.all(savePromises)

      toast({
        title: "Calendário confirmado",
        description: "As atribuições de parques foram salvas com sucesso",
      })
    } catch (error) {
      console.error("Error saving assignments:", error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar o calendário. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLockToggle = (date: string) => {
    setAssignments((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        isLocked: !prev[date]?.isLocked,
      },
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando calendário...</p>
      </div>
    )
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Coluna de Parques Não Alocados - Sempre visível */}
        <div className="lg:w-64 w-full order-2 lg:order-1">
          <UnassignedParksColumn parks={unassignedParks} />
        </div>

        {/* Calendário Principal */}
        <div className="flex-1 min-w-0 order-1 lg:order-2 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4 lg:mb-6">
            <div className="flex-shrink-0">
              <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                🎢 Calendário da Viagem
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
                Arraste e solte parques nos dias da semana
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <OptimizeButton
                tripId={tripId}
                onOptimizationComplete={(newAssignments) => {
                  setAssignments(newAssignments)
                }}
              />
              <Button 
                onClick={handleConfirmCalendar} 
                disabled={isSaving}
                className="gap-2 text-xs sm:text-sm"
                size="sm"
              >
                <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{isSaving ? "Salvando..." : "Confirmar Calendário"}</span>
                <span className="sm:hidden">{isSaving ? "Salvando..." : "Confirmar"}</span>
              </Button>
            </div>
          </div>
          <WeeklyCalendarGrid
            days={days}
            assignments={assignments}
            onLockToggle={handleLockToggle}
          />
        </div>
      </div>
    </DndContext>
  )
}
