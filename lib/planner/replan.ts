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
  availableAttractions: string[]
): Promise<DayPlanResponse["items"]> {
  // Remove item problemático
  const newItems = [...planItems]
  newItems.splice(itemIndex, 1)

  // TODO: Implementar lógica de substituição inteligente
  // Por enquanto, apenas remove o item

  return newItems
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

  for (const divergence of divergences) {
    if (divergence.reason === "closed" || divergence.reason === "high_wait") {
      newItems = await swapItem(newItems, divergence.itemIndex, divergence.reason, availableAttractions)
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
