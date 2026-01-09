import type { DayPlanRequest, DayPlanResponse } from "@/lib/dto/types"
import { getDayPlan, getDayPlanItems } from "@/lib/db/queries"
import { optimizeDayItinerary } from "./itineraryOptimizer"

interface LiveAttractionData {
  attractionId: string
  isOpen: boolean
  waitMinutes: number
}

/**
 * Detecta divergências entre plano e dados ao vivo
 */
export function detectDivergences(
  planItems: DayPlanResponse["items"],
  liveData: Map<string, LiveAttractionData>,
  maxWaitAcceptable: number = 60
): Array<{
  itemIndex: number
  item: DayPlanResponse["items"][0]
  reason: "closed" | "high_wait" | "low_wait"
  liveData: LiveAttractionData
}> {
  const divergences: Array<{
    itemIndex: number
    item: DayPlanResponse["items"][0]
    reason: "closed" | "high_wait" | "low_wait"
    liveData: LiveAttractionData
  }> = []

  for (let i = 0; i < planItems.length; i++) {
    const item = planItems[i]
    if (!item.attractionId) continue

    const live = liveData.get(item.attractionId)
    if (!live) continue

    // Atração fechada
    if (!live.isOpen) {
      divergences.push({
        itemIndex: i,
        item,
        reason: "closed",
        liveData: live,
      })
      continue
    }

    // Fila muito alta
    if (live.waitMinutes > maxWaitAcceptable) {
      divergences.push({
        itemIndex: i,
        item,
        reason: "high_wait",
        liveData: live,
      })
      continue
    }

    // Fila muito baixa (oportunidade de otimização)
    if (item.expectedWait && live.waitMinutes < item.expectedWait * 0.5) {
      divergences.push({
        itemIndex: i,
        item,
        reason: "low_wait",
        liveData: live,
      })
    }
  }

  return divergences
}

/**
 * Faz swap local: remove item problemático e substitui por alternativa
 */
async function swapItem(
  planItems: DayPlanResponse["items"],
  itemIndex: number,
  reason: "closed" | "high_wait",
  availableAttractions: string[],
  liveData: Map<string, LiveAttractionData>,
  currentTime: string,
  parkId: string
): Promise<DayPlanResponse["items"]> {
  // Remove item problemático
  const newItems = [...planItems]
  const removedItem = newItems[itemIndex]
  newItems.splice(itemIndex, 1)

  // Se não há atrações disponíveis, apenas remove
  if (availableAttractions.length === 0) {
    return newItems
  }

  // Busca atrações que ainda não estão no plano
  const plannedAttractionIds = new Set(
    newItems.filter((i) => i.attractionId).map((i) => i.attractionId!)
  )
  const unplannedAttractions = availableAttractions.filter(
    (id) => !plannedAttractionIds.has(id)
  )

  if (unplannedAttractions.length === 0) {
    return newItems
  }

  // Escolhe a melhor alternativa baseado em:
  // 1. Está aberta
  // 2. Tem menor fila
  // 3. Está próxima no tempo (pode ser inserida no slot)
  const candidates = unplannedAttractions
    .map((attractionId) => {
      const live = liveData.get(attractionId)
      if (!live || !live.isOpen) return null

      return {
        attractionId,
        waitMinutes: live.waitMinutes,
        score: live.waitMinutes, // Menor = melhor
      }
    })
    .filter((c): c is { attractionId: string; waitMinutes: number; score: number } => c !== null)
    .sort((a, b) => a.score - b.score)

  if (candidates.length === 0) {
    return newItems
  }

  // Insere a melhor alternativa no mesmo slot
  const bestCandidate = candidates[0]
  const startTime = removedItem.startTimeLocal
  const endTime = removedItem.endTimeLocal

  // Calcula novo end time baseado no wait time
  const [startHour, startMin] = startTime.split(":").map(Number)
  const totalMinutes = startHour * 60 + startMin + bestCandidate.waitMinutes + (removedItem.expectedWalk || 10)
  const newEndHour = Math.floor(totalMinutes / 60)
  const newEndMin = totalMinutes % 60
  const newEndTime = `${String(newEndHour).padStart(2, "0")}:${String(newEndMin).padStart(2, "0")}`

  // Busca nome da atração
  const { getAttractionsByPark } = await import("@/lib/db/queries")
  const attractions = await getAttractionsByPark(parkId)
  const attraction = attractions.find((a) => a.id === bestCandidate.attractionId)

  newItems.splice(itemIndex, 0, {
    orderIndex: itemIndex,
    type: "ride",
    title: attraction?.name || "Nova Atração",
    attractionId: bestCandidate.attractionId,
    startTimeLocal: startTime,
    endTimeLocal: newEndTime,
    expectedWait: bestCandidate.waitMinutes,
    expectedWalk: removedItem.expectedWalk || 10,
    riskScore: 0.1, // Baixo risco se está aberta
    explanation: [
      `Substituído por ${attraction?.name || "nova atração"} (fila: ${bestCandidate.waitMinutes} min)`,
    ],
  })

  // Reordena orderIndex
  return newItems.map((item, idx) => ({
    ...item,
    orderIndex: idx,
  }))
}

/**
 * Replaneja usando dados ao vivo
 */
export async function replanWithLiveData(
  request: DayPlanRequest,
  liveData: Map<string, LiveAttractionData>
): Promise<DayPlanResponse> {
  // Busca plano atual
  const tripDays = await import("@/lib/db/queries").then((m) => m.getTripDays(request.tripId))
  const day = tripDays.find((d) => d.date === request.date)
  if (!day) {
    throw new Error(`Trip day not found for ${request.date}`)
  }

  const { getDayPlan, getDayPlanItems } = await import("@/lib/db/queries")
  const currentPlan = await getDayPlan(day.id)
  if (!currentPlan) {
    // Se não há plano, gera novo
    return optimizeDayItinerary(request)
  }

  const currentItems = await getDayPlanItems(currentPlan.id)
  const planItems: DayPlanResponse["items"] = currentItems.map((item) => ({
    orderIndex: item.order_index,
    type: item.item_type as any,
    title: item.title,
    attractionId: item.attraction_id || undefined,
    startTimeLocal: item.start_time_local || "",
    endTimeLocal: item.end_time_local || "",
    expectedWait: item.expected_wait || undefined,
    expectedWalk: item.expected_walk || undefined,
    riskScore: item.risk_score || undefined,
    explanation: [],
  }))

  // Detecta divergências
  const maxWait = request.liveBias?.maxWaitAcceptable || 60
  const divergences = detectDivergences(planItems, liveData, maxWait)

  if (divergences.length === 0) {
    // Nenhuma divergência, retorna plano atual
    return {
      tripId: request.tripId,
      date: request.date,
      parkId: request.parkId,
      version: currentPlan.version,
      items: planItems,
      metrics: {
        totalPlannedRides: planItems.filter((i) => i.type === "ride").length,
        totalExpectedWait: planItems.reduce((sum, i) => sum + (i.expectedWait || 0), 0),
        totalWalk: planItems.reduce((sum, i) => sum + (i.expectedWalk || 0), 0),
        slackMinutes: 0, // Será calculado
      },
    }
  }

  // Faz swaps locais para itens problemáticos
  let newItems = planItems
  const availableAttractions = [
    ...request.mustDoAttractionIds,
    ...(request.wantAttractionIds || []),
  ]

  // Ordena divergências por índice (do maior para o menor) para evitar problemas de índice ao remover
  const sortedDivergences = [...divergences].sort((a, b) => b.itemIndex - a.itemIndex)

  // Calcula tempo atual (pode ser melhorado para usar hora real)
  const currentTime = new Date().toISOString().substring(11, 16) // HH:mm

  for (const divergence of sortedDivergences) {
    if (divergence.reason === "closed" || divergence.reason === "high_wait") {
      // Ajusta índice se já houve remoções anteriores
      const adjustedIndex = newItems.findIndex(
        (item) => item.orderIndex === divergence.item.orderIndex
      )
      if (adjustedIndex >= 0) {
        newItems = await swapItem(
          newItems,
          adjustedIndex,
          divergence.reason,
          availableAttractions,
          liveData,
          currentTime,
          request.parkId
        )
      }
    }
  }

  // Atualiza expected wait com dados ao vivo
  for (const item of newItems) {
    if (item.attractionId) {
      const live = liveData.get(item.attractionId)
      if (live && live.isOpen) {
        item.expectedWait = live.waitMinutes
      }
    }
  }

  // Salva nova versão do plano
  const nextVersion = currentPlan.version + 1
  const { createDayPlan, upsertDayPlanItems } = await import("@/lib/db/queries")

  const newPlan = await createDayPlan({
    trip_day_id: day.id,
    version: nextVersion,
    status: "draft",
    inputs: {
      ...request,
      replanReason: "live_data_divergence",
      divergences: divergences.map((d) => ({
        itemIndex: d.itemIndex,
        reason: d.reason,
      })),
    },
  })

  await upsertDayPlanItems(
    newItems.map((item) => ({
      day_plan_id: newPlan.id,
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
    version: nextVersion,
    items: newItems,
    metrics: {
      totalPlannedRides: newItems.filter((i) => i.type === "ride").length,
      totalExpectedWait: newItems.reduce((sum, i) => sum + (i.expectedWait || 0), 0),
      totalWalk: newItems.reduce((sum, i) => sum + (i.expectedWalk || 0), 0),
      slackMinutes: 0, // Será calculado
    },
  }
}
