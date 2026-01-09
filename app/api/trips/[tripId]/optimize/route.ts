import { NextRequest, NextResponse } from "next/server"
import { optimizeParkDays } from "@/lib/planner/parkDayOptimizer"
import { tripOptimizeRequestSchema, isValidTripOptimizeRequest } from "@/lib/dto/zod"

/**
 * POST /api/trips/[tripId]/optimize - Otimiza parques por dia
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const body = await request.json()
    const requestData = {
      ...body,
      tripId: params.tripId,
    }

    if (!isValidTripOptimizeRequest(requestData)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const result = await optimizeParkDays(requestData)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error optimizing trip:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
