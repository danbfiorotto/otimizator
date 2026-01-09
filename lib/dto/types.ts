/**
 * DTOs TypeScript conforme definido no Planner.md
 */

export type ParkDTO = {
  id: string // uuid
  slug: string
  name: string
  timezone: string // "America/New_York"
}

export type ParkCalendarDayDTO = {
  parkId: string
  date: string // YYYY-MM-DD
  crowdPercent?: number // 0-100 (predito)
  openTimeLocal?: string // "08:00"
  closeTimeLocal?: string // "23:00"
  earlyEntry?: { start: string; end: string } | null
  flags: {
    publicHoliday?: boolean
    rainyDay?: boolean
    ticketedEvent?: boolean
    extendedEvening?: boolean
  }
  source: "queue_times_calendar" | "themeparks_wiki" | "unknown"
}

export type AttractionDTO = {
  id: string
  parkId: string
  name: string
  landName?: string | null
  type?: string | null
  isArchived: boolean
}

export type AttractionLiveDTO = {
  attractionId: string
  isOpen: boolean
  waitMinutes: number
  lastUpdatedUtc: string // ISO
}

export type AttractionStatsHourDTO = {
  attractionId: string
  month: number // 1-12
  dow: number // 0=Sun
  hour: number // 0-23
  p50?: number
  p80?: number
  p95?: number
  openRate?: number // 0..1
  sampleCount: number
}

export type TripOptimizeRequest = {
  tripId: string
  parksToSchedule: string[] // park uuids
  constraints: {
    restDays?: number // ex: 1
    avoidWeekendsFor?: string[] // park ids
    maxHeavyStreak?: number // ex: 2
    lockedAssignments?: Array<{ date: string; parkId: string }>
  }
  weights: {
    crowd: number
    hours: number
    weekendPenalty: number
    travelDayPenalty: number
  }
}

export type TripOptimizeResponse = {
  tripId: string
  assignments: Array<{
    date: string
    parkId: string | null
    score: number // menor = melhor
    breakdown: Record<string, number>
    source: "optimizer"
  }>
  alternatives: Array<{
    name: string // "Plano B"
    assignments: Array<{ date: string; parkId: string | null; score: number }>
  }>
}

export type DayPlanRequest = {
  tripId: string
  date: string // YYYY-MM-DD
  parkId: string
  arrivalTimeLocal: string // "08:10"
  lunchWindow?: { start: string; end: string } // "12:30"-"13:00"
  walkMinutesDefault: number // ex 10
  mode: "p50" | "p80" // robustez
  mustDoAttractionIds: string[]
  wantAttractionIds?: string[]
  fixedItems?: Array<{
    type: "show" | "meal"
    title: string
    startTimeLocal: string
    endTimeLocal: string
  }>
  liveBias?: {
    enabled: boolean
    maxWaitAcceptable?: number // ex 60
  }
}

export type DayPlanResponse = {
  tripId: string
  date: string
  parkId: string
  parkHours?: { open: string; close: string } // local
  version: number
  items: Array<{
    orderIndex: number
    type: "ride" | "show" | "meal" | "buffer" | "travel"
    title: string
    attractionId?: string
    startTimeLocal: string
    endTimeLocal: string
    expectedWait?: number
    expectedWalk?: number
    riskScore?: number
    explanation?: string[]
  }>
  metrics: {
    totalPlannedRides: number
    totalExpectedWait: number
    totalWalk: number
    slackMinutes: number
  }
}
