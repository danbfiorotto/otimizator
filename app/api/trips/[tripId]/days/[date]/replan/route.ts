import { NextRequest, NextResponse } from "next/server"
import { replanWithLiveData } from "@/lib/planner/replan"
import { dayPlanRequestSchema, isValidDayPlanRequest } from "@/lib/dto/zod"
import type { AttractionLiveDTO } from "@/lib/dto/types"

/**
 * POST /api/trips/[tripId]/days/[date]/replan - Replano usando dados ao vivo
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string; date: string } }
) {
  try {
    const body = await request.json()
    const requestData = {
      ...body,
      tripId: params.tripId,
      date: params.date,
    }

    if (!isValidDayPlanRequest(requestData)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    // Busca live data
    const liveDataResponse = await fetch(
      `${request.nextUrl.origin}/api/parks/${requestData.parkId}/live`
    )
    if (!liveDataResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch live data" }, { status: 500 })
    }

    const liveDataArray: AttractionLiveDTO[] = await liveDataResponse.json()
    const liveDataMap = new Map(
      liveDataArray.map((d) => [
        d.attractionId,
        {
          attractionId: d.attractionId,
          isOpen: d.isOpen,
          waitMinutes: d.waitMinutes,
        },
      ])
    )

    const result = await replanWithLiveData(requestData, liveDataMap)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error replanning:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
