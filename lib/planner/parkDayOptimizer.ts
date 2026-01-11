import type { TripOptimizeRequest, TripOptimizeResponse } from "@/lib/dto/types"
import {
  calculateParkScoresForDate,
  calculateParkDateScore,
  type ScoringWeights,
} from "@/lib/planner/scoring"
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

  // Define parques pesados baseado nas preferências
  // Parques pesados são aqueles que requerem mais tempo/energia
  // Por padrão, se o ritmo for "intense", nenhum parque é considerado pesado
  // Se for "relaxed" ou "moderate", parques maiores são considerados pesados
  const heavyParks: string[] = []
  const pace = (trip.preferences?.pace as string | undefined) || "moderate"
  
  // Se o ritmo não for "intense", podemos considerar parques maiores como pesados
  // Por enquanto, deixamos vazio - pode ser expandido com uma lista de parques pesados
  // ou baseado em métricas como número de atrações, tamanho do parque, etc.

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

  // Calcula scores reais para cada assignment
  const assignmentArray = await Promise.all(
    Array.from(assignments.entries()).map(async ([date, parkId], index) => {
      if (!parkId) {
        return {
          date,
          parkId: null,
          score: 0,
          breakdown: {},
          source: "optimizer" as const,
        }
      }

      const previousParkId =
        index > 0 ? assignments.get(dates[index - 1]) || null : null

      const scoreResult = await calculateParkDateScore(parkId, date, weights, {
        startDate: context.startDate,
        endDate: context.endDate,
        previousParkId,
        heavyParks: context.heavyParks,
      })

      return {
        date,
        parkId,
        score: scoreResult.score,
        breakdown: Object.fromEntries(
          Object.entries(scoreResult.breakdown).filter(([_, v]) => typeof v === "number")
        ) as Record<string, number>,
        source: "optimizer" as const,
      }
    })
  )

  // Gera alternativas reais (Plano B e C) com diferentes estratégias
  // Plano B: prioriza menos crowd, aceita mais weekend
  const weightsB: ScoringWeights = {
    ...weights,
    crowd: weights.crowd * 1.5, // Mais peso em crowd
    weekendPenalty: weights.weekendPenalty * 0.5, // Menos penalidade de weekend
  }

  // Plano C: prioriza mais horas, menos penalidade de travel
  const weightsC: ScoringWeights = {
    ...weights,
    hours: weights.hours * 1.5, // Mais peso em horas
    travelDayPenalty: weights.travelDayPenalty * 0.5, // Menos penalidade de travel
  }

  // Gera assignments alternativos
  const assignmentsB = await greedyAssignment(dates, request.parksToSchedule, weightsB, context)
  const assignmentsC = await greedyAssignment(dates, request.parksToSchedule, weightsC, context)

  // Calcula scores para alternativas
  const alternativeB = await Promise.all(
    Array.from(assignmentsB.entries()).map(async ([date, parkId], index) => {
      if (!parkId) {
        return { date, parkId: null, score: 0 }
      }

      const previousParkId =
        index > 0 ? assignmentsB.get(dates[index - 1]) || null : null

      const scoreResult = await calculateParkDateScore(parkId, date, weightsB, {
        startDate: context.startDate,
        endDate: context.endDate,
        previousParkId,
        heavyParks: context.heavyParks,
      })

      return {
        date,
        parkId,
        score: scoreResult.score,
      }
    })
  )

  const alternativeC = await Promise.all(
    Array.from(assignmentsC.entries()).map(async ([date, parkId], index) => {
      if (!parkId) {
        return { date, parkId: null, score: 0 }
      }

      const previousParkId =
        index > 0 ? assignmentsC.get(dates[index - 1]) || null : null

      const scoreResult = await calculateParkDateScore(parkId, date, weightsC, {
        startDate: context.startDate,
        endDate: context.endDate,
        previousParkId,
        heavyParks: context.heavyParks,
      })

      return {
        date,
        parkId,
        score: scoreResult.score,
      }
    })
  )

  const alternatives = [
    {
      name: "Plano B (Menos Crowd)",
      assignments: alternativeB,
    },
    {
      name: "Plano C (Mais Horas)",
      assignments: alternativeC,
    },
  ]

  return {
    tripId: request.tripId,
    assignments: assignmentArray,
    alternatives,
  }
}
