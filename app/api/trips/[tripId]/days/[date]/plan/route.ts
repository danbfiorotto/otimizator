import { NextRequest, NextResponse } from "next/server"
import { optimizeDayItinerary } from "@/lib/planner/itineraryOptimizer"
import { dayPlanRequestSchema, isValidDayPlanRequest } from "@/lib/dto/zod"
import { getGroupSession } from "@/lib/utils/session"
import { createServiceClient } from "@/lib/db/supabaseServer"

/**
 * POST /api/trips/[tripId]/days/[date]/plan - Gera plano do dia
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string; date: string } }
) {
  try {
    const groupId = await getGroupSession()

    if (!groupId) {
      return NextResponse.json({ error: "No active group session" }, { status: 401 })
    }

    // Verify trip belongs to group
    const supabase = createServiceClient()
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id, group_id")
      .eq("id", params.tripId)
      .eq("group_id", groupId)
      .single()

    if (tripError || !trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    }

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
