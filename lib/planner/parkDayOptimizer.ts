import type { TripOptimizeRequest, TripOptimizeResponse } from "@/lib/dto/types"
import {
  calculateParkScoresForDate,
  calculateParkDateScore,
  type ScoringWeights,
} from "@/lib/planner/scoring"
import { parseDate, formatDate, getDayOfWeek } from "@/lib/utils/time"
import { getTripById, getTripDays, upsertTripDay, upsertTripDayAssignment, getParks } from "@/lib/db/queries"

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
 * Algoritmo global score assignment
 * Seleciona a melhor combinação (dia, parque) globalmente a cada passo
 * recalculando penalidades (consecutive) dinamicamente.
 */
async function globalScoreAssignment(
  dates: string[],
  parksToSchedule: string[],
  weights: ScoringWeights,
  context: {
    startDate: string
    endDate: string
    lockedAssignments: Map<string, string> // date -> parkId
    heavyParks: string[]
    maxConsecutiveDays?: number
  }
): Promise<Map<string, string | null>> {
  const assignments = new Map<string, string | null>()
  const remainingParks = new Set(parksToSchedule)
  const availableDates = new Set(dates)

  // 1. Processa bloqueios fixos (travel days e locked assignments)
  for (const date of dates) {
    if (context.lockedAssignments.has(date)) {
      assignments.set(date, context.lockedAssignments.get(date)!)
      remainingParks.delete(context.lockedAssignments.get(date)!)
      availableDates.delete(date)
    } else if (date === context.startDate || date === context.endDate) {
      // Bloqueia dias de viagem se não estiverem travados
      assignments.set(date, null)
      availableDates.delete(date)
    }
  }

  // 2. Loop principal: enquanto houver parques para agendar
  while (remainingParks.size > 0 && availableDates.size > 0) {
    let bestMove = {
      date: null as string | null,
      parkId: null as string | null,
      score: Infinity,
    }

    // Para cada dia disponível, calcula o score de todos os parques restantes
    for (const date of availableDates) {
      // Verifica restrição de dias consecutivos (lookbehind e lookahead simples)
      // Nota: Como estamos preenchendo fora de ordem, a verificação de streak precisa
      // olhar para o estado ATUAL da timeline.
      if (context.maxConsecutiveDays) {
        // Simulação rápida: se colocarmos um parque aqui, quebra o limite?
        // Precisaríamos reconstruir a timeline temporária (virtual). 
        // Simplificação: verifica apenas vizinhos imediatos já definidos
        // Para uma verificação robusta de maxConsecutiveDays em inserção global, 
        // precisaríamos montar a cadeia. Vamos confiar no penalty suave para desencorajar,
        // e usar o maxConsecutiveDays como hard cap.

        let consecutive = 0
        const dIndex = dates.indexOf(date)

        // Verifica cadeia para trás
        for (let i = dIndex - 1; i >= 0; i--) {
          const d = dates[i]
          if (assignments.has(d)) {
            if (assignments.get(d) !== null) consecutive++
            else break // Dia livre, streak quebrado
          } else {
            break // Dia não definido ainda. 
            // Na abordagem iterativa, dias não definidos podem vir a ser parque.
            // Porém, não podemos assumir que será. Então paramos a contagem certa.
          }
        }

        // Verifica cadeia para frente
        for (let i = dIndex + 1; i < dates.length; i++) {
          const d = dates[i]
          if (assignments.has(d)) {
            if (assignments.get(d) !== null) consecutive++
            else break
          } else {
            break
          }
        }

        // Nota: essa checagem é "frouxa" pois ignora os dias 'available' que podem virar parque.
        // Mas impede que a gente coloque um parque num 'buraco' de tamanho 1 entre dois blocos grandes.
        // É melhor que nada.

        if (consecutive >= context.maxConsecutiveDays) continue // Pula esse dia
      }

      // Contexto para score (olha vizinhos imediatos já definidos)
      const dIndex = dates.indexOf(date)
      const previousParkId = dIndex > 0 ? assignments.get(dates[dIndex - 1]) || null : null

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
        if (scores[0].score < bestMove.score) {
          bestMove = {
            date: date,
            parkId: scores[0].parkId,
            score: scores[0].score,
          }
        }
      }
    }

    // Se encontrou um movimento válido
    if (bestMove.date && bestMove.parkId) {
      assignments.set(bestMove.date, bestMove.parkId)
      remainingParks.delete(bestMove.parkId)
      availableDates.delete(bestMove.date)
    } else {
      // Não conseguiu alocar nenhum parque (provavelmente restrições)
      // Preenche o resto com null
      break
    }
  }

  // Preenche dias sobrando com null
  for (const date of availableDates) {
    assignments.set(date, null)
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
    maxConsecutiveDays?: number
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
  const pace = (trip.preferences?.pace as string | undefined) || "moderate"

  // Lista de slugs de parques considerados "pesados" (requerem mais tempo/energia)
  // Magic Kingdom e Hollywood Studios são geralmente os mais intensos
  const HEAVY_PARK_SLUGS = [
    "magic-kingdom",
    "hollywood-studios",
    "universal-studios-florida",
    "islands-of-adventure",
  ]

  // Busca os IDs dos parques pesados que estão na lista de parques selecionados
  let heavyParks: string[] = []
  if (pace !== "intense") {
    try {
      const allParks = await getParks()
      const selectedParkIds = new Set(request.parksToSchedule)

      // Filtra parques pesados que estão selecionados
      heavyParks = allParks
        .filter((park) => HEAVY_PARK_SLUGS.includes(park.slug) && selectedParkIds.has(park.id))
        .map((park) => park.id)
    } catch (error) {
      console.error("Error fetching parks for heavy parks detection:", error)
      // Em caso de erro, continua com lista vazia
      heavyParks = []
    }
  }

  const context = {
    startDate: trip.start_date,
    endDate: trip.end_date,
    lockedAssignments,
    heavyParks,
    maxConsecutiveDays: request.constraints.maxConsecutiveDays,
  }

  const weights: ScoringWeights = {
    crowd: request.weights.crowd,
    hours: request.weights.hours,
    weekendPenalty: request.weights.weekendPenalty,
    travelDayPenalty: request.weights.travelDayPenalty,
    heavyStreakPenalty: 0.4, // Default
    consecutivePenalty: 0.2, // Default: Penaliza dias seguidos para forçar espaçamento
  }

  // Fase 1: Global Assignment (substitui Greedy)
  let assignments = await globalScoreAssignment(dates, request.parksToSchedule, weights, context)

  // Fase 2: Melhoria local
  assignments = await localImprovement(dates, assignments, weights, context)

  // Calcula scores reais para cada assignment
  const assignmentArray = await Promise.all(
    Array.from(assignments.entries()).map(async ([date, parkId]) => {
      if (!parkId) {
        return {
          date,
          parkId: null,
          score: 0,
          breakdown: {},
          source: "optimizer" as const,
        }
      }

      const index = dates.indexOf(date)
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

  // Ordena por data
  assignmentArray.sort((a, b) => dates.indexOf(a.date) - dates.indexOf(b.date))

  // Gera alternativas reais (Plano B e C) com diferentes estratégias
  // Plano B: prioriza menos crowd, aceita mais weekend
  const weightsB: ScoringWeights = {
    ...weights,
    crowd: weights.crowd * 1.5, // Mais peso em crowd
    weekendPenalty: weights.weekendPenalty * 0.5, // Menos penalidade de weekend
    consecutivePenalty: 0.2,
  }

  // Plano C: prioriza mais horas, menos penalidade de travel
  const weightsC: ScoringWeights = {
    ...weights,
    hours: weights.hours * 1.5, // Mais peso em horas
    travelDayPenalty: weights.travelDayPenalty * 0.5, // Menos penalidade de travel
    consecutivePenalty: 0.2,
  }

  // Gera assignments alternativos
  const assignmentsB = await globalScoreAssignment(dates, request.parksToSchedule, weightsB, context)
  const assignmentsC = await globalScoreAssignment(dates, request.parksToSchedule, weightsC, context)

  // Calcula scores para alternativas
  const alternativeB = await Promise.all(
    Array.from(assignmentsB.entries()).map(async ([date, parkId]) => {
      if (!parkId) {
        return { date, parkId: null, score: 0 }
      }

      const index = dates.indexOf(date)
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
  alternativeB.sort((a, b) => dates.indexOf(a.date) - dates.indexOf(b.date))

  const alternativeC = await Promise.all(
    Array.from(assignmentsC.entries()).map(async ([date, parkId]) => {
      if (!parkId) {
        return { date, parkId: null, score: 0 }
      }

      const index = dates.indexOf(date)
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
  alternativeC.sort((a, b) => dates.indexOf(a.date) - dates.indexOf(b.date))

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
