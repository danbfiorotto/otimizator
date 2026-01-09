import { NextRequest, NextResponse } from "next/server"
import { optimizeDayItinerary } from "@/lib/planner/itineraryOptimizer"
import { dayPlanRequestSchema, isValidDayPlanRequest } from "@/lib/dto/zod"

/**
 * POST /api/trips/[tripId]/days/[date]/plan - Gera plano do dia
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

    const result = await optimizeDayItinerary(requestData)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error generating day plan:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
