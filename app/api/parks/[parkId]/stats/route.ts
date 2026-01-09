import { NextRequest, NextResponse } from "next/server"
import { getStatsCache } from "@/lib/utils/cache"
import { getAttractionsByPark, getAttractionHourStats } from "@/lib/db/queries"
import type { AttractionStatsHourDTO } from "@/lib/dto/types"

/**
 * GET /api/parks/[parkId]/stats - Estatísticas agregadas do parque
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { parkId: string } }
) {
  try {
    const stats = await getStatsCache(params.parkId, async () => {
      const attractions = await getAttractionsByPark(params.parkId)
      const allStats: AttractionStatsHourDTO[] = []

      for (const attraction of attractions) {
        // Busca stats para todas as combinações mês/dow/hora
        for (let month = 1; month <= 12; month++) {
          for (let dow = 0; dow <= 6; dow++) {
            for (let hour = 0; hour <= 23; hour++) {
              const stat = await getAttractionHourStats(attraction.id, month, dow, hour)
              if (stat) {
                allStats.push({
                  attractionId: attraction.id,
                  month,
                  dow,
                  hour,
                  p50: stat.p50 ?? undefined,
                  p80: stat.p80 ?? undefined,
                  p95: stat.p95 ?? undefined,
                  openRate: stat.open_rate ?? undefined,
                  sampleCount: stat.sample_count,
                })
              }
            }
          }
        }
      }

      return allStats
    })

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
