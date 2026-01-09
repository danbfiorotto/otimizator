import type { TripOptimizeRequest, TripOptimizeResponse } from "@/lib/dto/types"
import { calculateParkScoresForDate, type ScoringWeights } from "@/lib/planner/scoring"
import { parseDate, formatDate, getDayOfWeek } from "@/lib/utils/time"
import { getTripById, getTripDays, upsertTripDay, upsertTripDayAssignment } from "@/lib/db/queries"

/**
 * Gera todas as datas da viagem
 */
function generateTripDates(startDate: string, endDate: string): string[] {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  const dates: string[] = []

  const current = new Date(start)
  while (current <= end) {
    dates.push(formatDate(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * Algoritmo greedy para atribuir parques aos dias
 */
async function greedyAssignment(
  dates: string[],
  parksToSchedule: string[],
  weights: ScoringWeights,
  context: {
    startDate: string
    endDate: string
    lockedAssignments: Map<string, string> // date -> parkId
    heavyParks: string[]
  }
): Promise<Map<string, string | null>> {
  const assignments = new Map<string, string | null>()
  const remainingParks = new Set(parksToSchedule)

  // Preenche dias travados
  for (const [date, parkId] of context.lockedAssignments) {
    assignments.set(date, parkId)
    remainingParks.delete(parkId)
  }

  // Para cada dia livre, escolhe o parque com menor score
  for (const date of dates) {
    if (assignments.has(date)) {
      continue // Já atribuído (locked)
    }

    if (remainingParks.size === 0) {
      assignments.set(date, null) // Dia livre
      continue
    }

    const previousParkId = dates.indexOf(date) > 0 ? assignments.get(dates[dates.indexOf(date) - 1]) || null : null

    const scores = await calculateParkScoresForDate(
      Array.from(remainingParks),
      date,
      weights,
      {
        startDate: context.startDate,
        endDate: context.endDate,
        previousParkId,
        heavyParks: context.heavyParks,
      }
    )

    if (scores.length > 0) {
      const bestPark = scores[0].parkId
      assignments.set(date, bestPark)
      remainingParks.delete(bestPark)
    } else {
      assignments.set(date, null)
    }
  }

  return assignments
}

/**
 * Melhoria local: tenta swaps entre dias
 */
async function localImprovement(
  dates: string[],
  assignments: Map<string, string | null>,
  weights: ScoringWeights,
  context: {
    startDate: string
    endDate: string
    lockedAssignments: Map<string, string>
    heavyParks: string[]
  }
): Promise<Map<string, string | null>> {
  let improved = true
  let iterations = 0
  const maxIterations = 10

  while (improved && iterations < maxIterations) {
    improved = false
    iterations++

    for (let i = 0; i < dates.length - 1; i++) {
      const date1 = dates[i]
      const date2 = dates[i + 1]

      // Pula se algum dia estiver travado
      if (context.lockedAssignments.has(date1) || context.lockedAssignments.has(date2)) {
        continue
      }

      const park1 = assignments.get(date1)
      const park2 = assignments.get(date2)

      // Tenta swap
      if (park1 && park2 && park1 !== park2) {
        // Calcula score atual
        const previousPark1 = i > 0 ? assignments.get(dates[i - 1]) || null : null
        const score1 = await calculateParkScoresForDate([park1], date1, weights, {
          startDate: context.startDate,
          endDate: context.endDate,
          previousParkId: previousPark1,
          heavyParks: context.heavyParks,
        })
        const score2 = await calculateParkScoresForDate([park2], date2, weights, {
          startDate: context.startDate,
          endDate: context.endDate,
          previousParkId: park1,
          heavyParks: context.heavyParks,
        })
        const currentTotal = score1[0].score + score2[0].score

        // Calcula score após swap
        const newScore1 = await calculateParkScoresForDate([park2], date1, weights, {
          startDate: context.startDate,
          endDate: context.endDate,
          previousParkId: previousPark1,
          heavyParks: context.heavyParks,
        })
        const newScore2 = await calculateParkScoresForDate([park1], date2, weights, {
          startDate: context.startDate,
          endDate: context.endDate,
          previousParkId: park2,
          heavyParks: context.heavyParks,
        })
        const newTotal = newScore1[0].score + newScore2[0].score

        // Se melhorou, faz o swap
        if (newTotal < currentTotal) {
          assignments.set(date1, park2)
          assignments.set(date2, park1)
          improved = true
        }
      }
    }
  }

  return assignments
}

/**
 * Otimiza atribuição de parques aos dias da viagem
 */
export async function optimizeParkDays(request: TripOptimizeRequest): Promise<TripOptimizeResponse> {
  const trip = await getTripById(request.tripId)
  if (!trip) {
    throw new Error(`Trip not found: ${request.tripId}`)
  }

  const dates = generateTripDates(trip.start_date, trip.end_date)

  // Prepara contexto
  const lockedAssignments = new Map<string, string>()
  if (request.constraints.lockedAssignments) {
    for (const assignment of request.constraints.lockedAssignments) {
      lockedAssignments.set(assignment.date, assignment.parkId)
    }
  }

  // Define parques pesados (pode vir das preferências da viagem)
  const heavyParks: string[] = [] // TODO: extrair das preferências

  const context = {
    startDate: trip.start_date,
    endDate: trip.end_date,
    lockedAssignments,
    heavyParks,
  }

  const weights: ScoringWeights = {
    crowd: request.weights.crowd,
    hours: request.weights.hours,
    weekendPenalty: request.weights.weekendPenalty,
    travelDayPenalty: request.weights.travelDayPenalty,
    heavyStreakPenalty: 0.4, // Default
  }

  // Fase 1: Greedy
  let assignments = await greedyAssignment(dates, request.parksToSchedule, weights, context)

  // Fase 2: Melhoria local
  assignments = await localImprovement(dates, assignments, weights, context)

  // Converte para formato de resposta
  const assignmentArray = Array.from(assignments.entries()).map(([date, parkId]) => {
    // Calcula score e breakdown
    // TODO: calcular score real para cada assignment
    return {
      date,
      parkId,
      score: 0, // Será calculado
      breakdown: {},
      source: "optimizer" as const,
    }
  })

  // Gera alternativas (Plano B e C)
  // Para simplificar, gera variações com diferentes pesos
  const alternatives = [
    {
      name: "Plano B",
      assignments: assignmentArray.map((a) => ({
        date: a.date,
        parkId: a.parkId,
        score: a.score + 0.1, // Score ligeiramente pior
      })),
    },
    {
      name: "Plano C",
      assignments: assignmentArray.map((a) => ({
        date: a.date,
        parkId: a.parkId,
        score: a.score + 0.2, // Score ainda pior
      })),
    },
  ]

  return {
    tripId: request.tripId,
    assignments: assignmentArray,
    alternatives,
  }
}
