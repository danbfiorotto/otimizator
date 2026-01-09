import { NextRequest, NextResponse } from "next/server"
import { getLiveCache } from "@/lib/utils/cache"
import { getAttractionsByPark, getLatestWaitSamples } from "@/lib/db/queries"
import type { AttractionLiveDTO } from "@/lib/dto/types"

/**
 * GET /api/parks/[parkId]/live - Snapshot atual de filas (cacheado 60-120s)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { parkId: string } }
) {
  try {
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
