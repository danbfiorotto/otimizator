import { getParkDayScore, getParkCalendarDays } from "@/lib/db/queries"
import { getDayOfWeek, parseDate } from "@/lib/utils/time"

export interface ParkDateScore {
  parkId: string
  date: string
  score: number
  breakdown: {
    crowd: number
    hours: number
    weekend: number
    travel: number
    streak: number
    consecutive: number
  }
}

export interface ScoringWeights {
  crowd: number
  hours: number
  weekendPenalty: number
  travelDayPenalty: number
  heavyStreakPenalty: number
  consecutivePenalty: number
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  crowd: 1.0,
  hours: 0.5,
  weekendPenalty: 0.3,
  travelDayPenalty: 0.2,
  heavyStreakPenalty: 0.4,
  consecutivePenalty: 0.1, // Penalidade leve para dias seguidos num geral
}

/**
 * Calcula crowd score para um parque em uma data
 */
async function calculateCrowdScore(parkId: string, date: string): Promise<number> {
  // Tenta obter score do método 'hybrid' primeiro, depois 'calendar', depois 'computed'
  const hybridScore = await getParkDayScore(parkId, date, "hybrid")
  if (hybridScore) {
    return hybridScore.crowd_score
  }

  const calendarScore = await getParkDayScore(parkId, date, "calendar")
  if (calendarScore) {
    return calendarScore.crowd_score
  }

  const computedScore = await getParkDayScore(parkId, date, "computed")
  if (computedScore) {
    return computedScore.crowd_score
  }

  // Fallback: 0.5 (médio)
  return 0.5
}

/**
 * Calcula penalty por horas de funcionamento
 */
async function calculateHoursPenalty(parkId: string, date: string): Promise<number> {
  const calendarDays = await getParkCalendarDays(parkId, date, date)
  if (calendarDays.length === 0) {
    return 0.5 // Penalidade média se não houver dados
  }

  const day = calendarDays[0]
  if (!day.open_time_local || !day.close_time_local) {
    return 0.5
  }

  const [openHour] = day.open_time_local.split(":").map(Number)
  const [closeHour] = day.close_time_local.split(":").map(Number)
  const hours = closeHour - openHour

  // Penaliza dias com menos de 10 horas
  if (hours < 10) {
    return (10 - hours) / 10 // 0 a 1
  }

  return 0
}

/**
 * Calcula penalty para fim de semana
 */
function calculateWeekendPenalty(date: string): number {
  const dateObj = parseDate(date)
  const dow = getDayOfWeek(dateObj)
  return dow === 0 || dow === 6 ? 1.0 : 0.0 // Sábado ou domingo
}

/**
 * Calcula penalty para dias de viagem (primeiro/último dia)
 */
function calculateTravelDayPenalty(date: string, startDate: string, endDate: string): number {
  if (date === startDate || date === endDate) {
    return 1.0
  }
  return 0.0
}

/**
 * Calcula penalty para streak de parques pesados
 */
function calculateHeavyStreakPenalty(
  currentParkId: string,
  previousParkId: string | null,
  heavyParks: string[]
): number {
  if (!previousParkId) {
    return 0.0
  }

  const currentIsHeavy = heavyParks.includes(currentParkId)
  const previousIsHeavy = heavyParks.includes(previousParkId)

  if (currentIsHeavy && previousIsHeavy) {
    return 1.0 // Dois parques pesados seguidos
  }

  return 0.0
}

/**
 * Calcula penalty para dias consecutivos (qualquer parque)
 */
function calculateConsecutivePenalty(
  previousParkId: string | null
): number {
  if (previousParkId) {
    return 1.0 // Dia anterior teve parque
  }
  return 0.0
}

/**
 * Calcula score completo para um parque em uma data
 */
export async function calculateParkDateScore(
  parkId: string,
  date: string,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  context?: {
    startDate?: string
    endDate?: string
    previousParkId?: string | null
    heavyParks?: string[]
  }
): Promise<ParkDateScore> {
  const crowd = await calculateCrowdScore(parkId, date)
  const hours = await calculateHoursPenalty(parkId, date)
  const weekend = calculateWeekendPenalty(date)
  const travel = context?.startDate && context?.endDate
    ? calculateTravelDayPenalty(date, context.startDate, context.endDate)
    : 0
  const streak = context?.previousParkId && context?.heavyParks
    ? calculateHeavyStreakPenalty(parkId, context.previousParkId, context.heavyParks)
    : 0
  const consecutive = context?.previousParkId
    ? calculateConsecutivePenalty(context.previousParkId)
    : 0

  const breakdown = {
    crowd,
    hours,
    weekend,
    travel,
    streak,
    consecutive,
  }

  const score =
    weights.crowd * crowd +
    weights.hours * hours +
    weights.weekendPenalty * weekend +
    weights.travelDayPenalty * travel +
    weights.heavyStreakPenalty * streak +
    weights.consecutivePenalty * consecutive

  return {
    parkId,
    date,
    score,
    breakdown,
  }
}

/**
 * Calcula scores para múltiplos parques em uma data
 */
export async function calculateParkScoresForDate(
  parkIds: string[],
  date: string,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  context?: {
    startDate?: string
    endDate?: string
    previousParkId?: string | null
    heavyParks?: string[]
  }
): Promise<ParkDateScore[]> {
  const scores = await Promise.all(
    parkIds.map((parkId) => calculateParkDateScore(parkId, date, weights, context))
  )

  return scores.sort((a, b) => a.score - b.score) // Menor score = melhor
}
