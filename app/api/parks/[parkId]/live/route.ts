import { NextRequest, NextResponse } from "next/server"
import { getLiveCache, clearCache } from "@/lib/utils/cache"
import { rateLimit } from "@/lib/utils/rateLimit"
import { getAttractionsByPark, getLatestWaitSamples, getSourceMapping } from "@/lib/db/queries"
import { processQueueTimesPark } from "@/lib/connectors/queueTimesRealtime"
import type { AttractionLiveDTO } from "@/lib/dto/types"

const UPDATE_INTERVAL_MS = 5 * 60 * 1000 // 5 minutos
const RATE_LIMIT_UPDATE_WINDOW = 5 * 60 // 5 minutos em segundos

/**
 * GET /api/parks/[parkId]/live - Snapshot atual de filas com update on-demand
 * 
 * Comportamento:
 * - Retorna dados do cache (120s) quando disponíveis
 * - Se os dados estão desatualizados (>5min), tenta atualizar em background
 * - Rate limiting: máximo 1 update por parque a cada 5 minutos
 * 
 * Nota: Devido à limitação do plano Hobby (apenas cron jobs diários),
 * os dados ao vivo são atualizados on-demand quando este endpoint é chamado.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { parkId: string } }
) {
  try {
    // Busca dados do cache ou do banco
    const liveData = await getLiveCache(params.parkId, async () => {
      const attractions = await getAttractionsByPark(params.parkId)
      const live: AttractionLiveDTO[] = []

      for (const attraction of attractions) {
        const samples = await getLatestWaitSamples(attraction.id, 1)
        if (samples.length > 0) {
          const latest = samples[0]
          live.push({
            attractionId: attraction.id,
            isOpen: latest.is_open,
            waitMinutes: latest.wait_minutes,
            lastUpdatedUtc: latest.sampled_at,
          })
        }
      }

      return live
    })

    // Verifica se precisa atualizar (dados mais antigos que 5 minutos)
    const needsUpdate = liveData.length > 0 && liveData[0]?.lastUpdatedUtc
      ? Date.now() - new Date(liveData[0].lastUpdatedUtc).getTime() > UPDATE_INTERVAL_MS
      : true

    // Se precisa atualizar e não está em rate limit, atualiza em background
    if (needsUpdate) {
      // Rate limit específico para updates deste parque (1 update a cada 5 minutos)
      const rateLimitResult = await rateLimit(`update:park:${params.parkId}`, 1, RATE_LIMIT_UPDATE_WINDOW)
      
      if (rateLimitResult.success) {
        // Atualiza em background (não bloqueia a resposta)
        updateParkDataInBackground(params.parkId).catch((error) => {
          console.error(`Background update failed for park ${params.parkId}:`, error)
        })
      }
    }

    return NextResponse.json(liveData, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    })
  } catch (error) {
    console.error("Error fetching live data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Atualiza dados do parque em background
 */
async function updateParkDataInBackground(parkId: string): Promise<void> {
  try {
    // Busca Queue-Times ID do parque
    const mapping = await getSourceMapping("queue_times", "park", parkId)
    if (!mapping) {
      console.warn(`No Queue-Times mapping found for park ${parkId}`)
      return
    }

    const queueTimesId = parseInt(mapping.source_id, 10)
    
    // Processa dados do parque
    await processQueueTimesPark(queueTimesId)
    
    // Limpa cache para forçar refresh na próxima requisição
    await clearCache(`live:park:${parkId}` as const)
    
    console.log(`Background update completed for park ${parkId}`)
  } catch (error) {
    console.error(`Error updating park data for ${parkId}:`, error)
    throw error
  }
}
