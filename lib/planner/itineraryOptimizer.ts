import type { DayPlanRequest, DayPlanResponse } from "@/lib/dto/types"
import {
  getAttractionsByPark,
  getAttractionHourStats,
  getParkCalendarDays,
  createDayPlan,
  upsertDayPlanItems,
  getTripDays,
} from "@/lib/db/queries"
import { getDayOfWeek, getMonth, parseDate, addMinutesToTime, timeDifference, isTimeBefore } from "@/lib/utils/time"
import type { AttractionHourStats } from "@/lib/db/schema"

interface TimelineSlot {
  time: string // HH:mm
  available: boolean
  item?: {
    type: "ride" | "show" | "meal" | "buffer" | "travel"
    title: string
    attractionId?: string
    startTime: string
    endTime: string
    expectedWait?: number
    expectedWalk?: number
    riskScore?: number
  }
}

interface AttractionCandidate {
  attractionId: string
  name: string
  priority: "must" | "want" | "optional"
  expectedWait: number
  riskScore: number
  walkTime: number
}

const SLOT_DURATION = 5 // minutos
const DEFAULT_WALK_TIME = 10 // minutos

/**
 * Gera slots de timeline para o dia
 */
function generateTimelineSlots(openTime: string, closeTime: string): TimelineSlot[] {
  const slots: TimelineSlot[] = []
  const [openHour, openMin] = openTime.split(":").map(Number)
  const [closeHour, closeMin] = closeTime.split(":").map(Number)

  let currentHour = openHour
  let currentMin = openMin

  while (currentHour < closeHour || (currentHour === closeHour && currentMin <= closeMin)) {
    const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`
    slots.push({
      time: timeStr,
      available: true,
    })

    currentMin += SLOT_DURATION
    if (currentMin >= 60) {
      currentMin = 0
      currentHour++
    }
  }

  return slots
}

/**
 * Calcula fila esperada para uma atração em um horário
 */
async function calculateExpectedWait(
  attractionId: string,
  date: string,
  time: string,
  mode: "p50" | "p80"
): Promise<number> {
  const dateObj = parseDate(date)
  const month = getMonth(dateObj)
  const dow = getDayOfWeek(dateObj)
  const [hour] = time.split(":").map(Number)

  const stats = await getAttractionHourStats(attractionId, month, dow, hour)
  if (!stats) {
    return 30 // Default
  }

  if (mode === "p50") {
    return stats.p50 || 30
  } else {
    return stats.p80 || 45
  }
}

/**
 * Calcula risco de downtime para uma atração em um horário
 */
async function calculateRiskScore(
  attractionId: string,
  date: string,
  time: string
): Promise<number> {
  const dateObj = parseDate(date)
  const month = getMonth(dateObj)
  const dow = getDayOfWeek(dateObj)
  const [hour] = time.split(":").map(Number)

  const stats = await getAttractionHourStats(attractionId, month, dow, hour)
  if (!stats || stats.open_rate === null) {
    return 0.1 // Risco baixo por padrão
  }

  return 1 - stats.open_rate // Risco = 1 - taxa de abertura
}

/**
 * Calcula tempo de caminhada entre duas atrações (simplificado: por land)
 */
function calculateWalkTime(
  attraction1: { landName?: string | null },
  attraction2: { landName?: string | null }
): number {
  // Se estão na mesma land, 5 min
  if (attraction1.landName && attraction2.landName && attraction1.landName === attraction2.landName) {
    return 5
  }

  // Se uma não tem land, assume default
  if (!attraction1.landName || !attraction2.landName) {
    return DEFAULT_WALK_TIME
  }

  // Diferentes lands, 10-15 min
  return DEFAULT_WALK_TIME
}

/**
 * Seleciona próxima atração candidata
 */
async function selectNextAttraction(
  candidates: AttractionCandidate[],
  currentTime: string,
  slots: TimelineSlot[],
  fixedItems: DayPlanRequest["fixedItems"]
): Promise<AttractionCandidate | null> {
  // Remove atrações já agendadas
  const scheduledAttractionIds = new Set(
    slots
      .filter((s) => s.item?.attractionId)
      .map((s) => s.item!.attractionId!)
  )

  const available = candidates.filter((c) => !scheduledAttractionIds.has(c.attractionId))

  if (available.length === 0) {
    return null
  }

  // Calcula score: valor (prioridade) / custo (fila + caminhada + risco)
  const scored = await Promise.all(
    available.map(async (candidate) => {
      const priorityWeight = candidate.priority === "must" ? 3 : candidate.priority === "want" ? 2 : 1
      const cost = candidate.expectedWait + candidate.walkTime + candidate.riskScore * 30 // risco em minutos equivalentes
      const score = priorityWeight / (cost + 1) // +1 para evitar divisão por zero

      return {
        candidate,
        score,
      }
    })
  )

  // Retorna o melhor candidato
  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.candidate || null
}

/**
 * Gera itinerário otimizado para o dia
 */
export async function optimizeDayItinerary(request: DayPlanRequest): Promise<DayPlanResponse> {
  // Busca horários do parque
  const calendarDays = await getParkCalendarDays(request.parkId, request.date, request.date)
  if (calendarDays.length === 0) {
    throw new Error(`No park hours found for ${request.parkId} on ${request.date}`)
  }

  const parkDay = calendarDays[0]
  const openTime = parkDay.open_time_local || "09:00"
  const closeTime = parkDay.close_time_local || "22:00"

  // Busca atrações
  const allAttractions = await getAttractionsByPark(request.parkId)
  const mustDoAttractions = allAttractions.filter((a) => request.mustDoAttractionIds.includes(a.id))
  const wantAttractions = request.wantAttractionIds
    ? allAttractions.filter((a) => request.wantAttractionIds!.includes(a.id))
    : []

  // Gera slots
  const slots = generateTimelineSlots(openTime, closeTime)

  // Marca janelas fixas (lunch, shows)
  if (request.fixedItems) {
    for (const fixedItem of request.fixedItems) {
      const startSlot = slots.findIndex((s) => s.time >= fixedItem.startTimeLocal)
      const endSlot = slots.findIndex((s) => s.time >= fixedItem.endTimeLocal)

      if (startSlot >= 0 && endSlot >= 0) {
        for (let i = startSlot; i < endSlot; i++) {
          slots[i].available = false
          slots[i].item = {
            type: fixedItem.type,
            title: fixedItem.title,
            startTime: fixedItem.startTimeLocal,
            endTime: fixedItem.endTimeLocal,
          }
        }
      }
    }
  }

  // Estratégia rope drop: prioriza must-do nas primeiras 2 horas
  const arrivalSlot = slots.findIndex((s) => s.time >= request.arrivalTimeLocal)
  const ropeDropEndSlot = Math.min(
    arrivalSlot + (120 / SLOT_DURATION), // 2 horas
    slots.length
  )

  // Preenche rope drop com must-do
  let currentSlot = arrivalSlot
  const mustDoCandidates: AttractionCandidate[] = []

  for (const attraction of mustDoAttractions) {
    const time = slots[currentSlot]?.time || request.arrivalTimeLocal
    const expectedWait = await calculateExpectedWait(attraction.id, request.date, time, request.mode)
    const riskScore = await calculateRiskScore(attraction.id, request.date, time)

    mustDoCandidates.push({
      attractionId: attraction.id,
      name: attraction.name,
      priority: "must",
      expectedWait,
      riskScore,
      walkTime: DEFAULT_WALK_TIME,
    })
  }

  // Ordena must-do por p80 (maiores primeiro para rope drop)
  mustDoCandidates.sort((a, b) => b.expectedWait - a.expectedWait)

  for (const candidate of mustDoCandidates) {
    if (currentSlot >= ropeDropEndSlot) break
    if (!slots[currentSlot]?.available) {
      currentSlot++
      continue
    }

    const attraction = allAttractions.find((a) => a.id === candidate.attractionId)!
    const waitMinutes = candidate.expectedWait
    const totalMinutes = waitMinutes + candidate.walkTime

    slots[currentSlot].available = false
    slots[currentSlot].item = {
      type: "ride",
      title: attraction.name,
      attractionId: attraction.id,
      startTime: slots[currentSlot].time,
      endTime: addMinutesToTime(slots[currentSlot].time, totalMinutes),
      expectedWait: waitMinutes,
      expectedWalk: candidate.walkTime,
      riskScore: candidate.riskScore,
    }

    currentSlot += Math.ceil(totalMinutes / SLOT_DURATION)
  }

  // Preenche resto do dia com want/optional
  const allCandidates: AttractionCandidate[] = [
    ...wantAttractions.map((a) => ({
      attractionId: a.id,
      name: a.name,
      priority: "want" as const,
      expectedWait: 0, // Será calculado
      riskScore: 0, // Será calculado
      walkTime: DEFAULT_WALK_TIME,
    })),
  ]

  // Continua preenchendo slots disponíveis
  for (let i = ropeDropEndSlot; i < slots.length; i++) {
    if (!slots[i].available) continue

    // Calcula expected wait e risk para cada candidato
    for (const candidate of allCandidates) {
      candidate.expectedWait = await calculateExpectedWait(
        candidate.attractionId,
        request.date,
        slots[i].time,
        request.mode
      )
      candidate.riskScore = await calculateRiskScore(candidate.attractionId, request.date, slots[i].time)
    }

    const next = await selectNextAttraction(allCandidates, slots[i].time, slots, request.fixedItems)
    if (!next) break

    const attraction = allAttractions.find((a) => a.id === next.attractionId)!
    const totalMinutes = next.expectedWait + next.walkTime

    slots[i].available = false
    slots[i].item = {
      type: "ride",
      title: attraction.name,
      attractionId: attraction.id,
      startTime: slots[i].time,
      endTime: addMinutesToTime(slots[i].time, totalMinutes),
      expectedWait: next.expectedWait,
      expectedWalk: next.walkTime,
      riskScore: next.riskScore,
    }

    // Marca próximos slots como ocupados
    for (let j = 1; j < Math.ceil(totalMinutes / SLOT_DURATION); j++) {
      if (i + j < slots.length) {
        slots[i + j].available = false
      }
    }
  }

  // Converte slots para items do plano
  const items = slots
    .filter((s) => s.item)
    .map((s, index) => ({
      orderIndex: index,
      type: s.item!.type,
      title: s.item!.title,
      attractionId: s.item!.attractionId,
      startTimeLocal: s.item!.startTime,
      endTimeLocal: s.item!.endTime,
      expectedWait: s.item!.expectedWait,
      expectedWalk: s.item!.expectedWalk,
      riskScore: s.item!.riskScore,
      explanation: [],
    }))

  // Calcula métricas
  const rides = items.filter((i) => i.type === "ride")
  const totalPlannedRides = rides.length
  const totalExpectedWait = rides.reduce((sum, r) => sum + (r.expectedWait || 0), 0)
  const totalWalk = items.reduce((sum, i) => sum + (i.expectedWalk || 0), 0)
  const totalTime = timeDifference(openTime, closeTime)
  const usedTime = totalExpectedWait + totalWalk
  const slackMinutes = totalTime - usedTime

  // Salva no banco
  const tripDay = await getTripDays(request.tripId)
  const day = tripDay.find((d) => d.date === request.date)
  if (!day) {
    throw new Error(`Trip day not found for ${request.date}`)
  }

  // Busca última versão do plano
  const { createDayPlan, getDayPlan } = await import("@/lib/db/queries")
  const lastPlan = await getDayPlan(day.id)
  const nextVersion = lastPlan ? lastPlan.version + 1 : 1

  const dayPlan = await createDayPlan({
    trip_day_id: day.id,
    version: nextVersion,
    status: "draft",
    inputs: {
      arrivalTime: request.arrivalTimeLocal,
      lunchWindow: request.lunchWindow,
      walkMinutesDefault: request.walkMinutesDefault,
      mode: request.mode,
      mustDoAttractionIds: request.mustDoAttractionIds,
      wantAttractionIds: request.wantAttractionIds,
      fixedItems: request.fixedItems,
    },
  })

  await upsertDayPlanItems(
    items.map((item) => ({
      day_plan_id: dayPlan.id,
      order_index: item.orderIndex,
      attraction_id: item.attractionId || null,
      title: item.title,
      item_type: item.type,
      start_time_local: item.startTimeLocal,
      end_time_local: item.endTimeLocal,
      expected_wait: item.expectedWait || null,
      expected_walk: item.expectedWalk || null,
      risk_score: item.riskScore || null,
      meta: {},
    }))
  )

  return {
    tripId: request.tripId,
    date: request.date,
    parkId: request.parkId,
    parkHours: {
      open: openTime,
      close: closeTime,
    },
    version: nextVersion,
    items,
    metrics: {
      totalPlannedRides,
      totalExpectedWait,
      totalWalk,
      slackMinutes,
    },
  }
}
