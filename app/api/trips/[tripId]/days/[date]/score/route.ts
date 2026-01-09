import { NextRequest, NextResponse } from "next/server"
import { getGroupSession } from "@/lib/utils/session"
import { createServiceClient } from "@/lib/db/supabaseServer"
import { calculateParkDateScore } from "@/lib/planner/scoring"
import { DEFAULT_WEIGHTS } from "@/lib/planner/scoring"
import type { ScoringWeights } from "@/lib/planner/scoring"

/**
 * GET /api/trips/[tripId]/days/[date]/score?parkId=... - Calcula score para um parque em uma data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string; date: string } }
) {
  try {
    const groupId = await getGroupSession()

    if (!groupId) {
      return NextResponse.json({ error: "No active group session" }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Verify trip belongs to group
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id, group_id, start_date, end_date, preferences")
      .eq("id", params.tripId)
      .eq("group_id", groupId)
      .single()

    if (tripError || !trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const parkId = searchParams.get("parkId")

    if (!parkId) {
      return NextResponse.json({ error: "parkId is required" }, { status: 400 })
    }

    // Get previous day's park for context
    const { data: previousDay } = await supabase
      .from("trip_days")
      .select("id, date")
      .eq("trip_id", params.tripId)
      .lt("date", params.date)
      .order("date", { ascending: false })
      .limit(1)
      .single()

    let previousParkId: string | null = null
    if (previousDay) {
      const { data: prevAssignment } = await supabase
        .from("trip_day_assignments")
        .select("park_id")
        .eq("trip_day_id", previousDay.id)
        .single()
      previousParkId = prevAssignment?.park_id || null
    }

    // Build weights from trip preferences
    const weights: ScoringWeights = {
      ...DEFAULT_WEIGHTS,
      weekendPenalty: (trip.preferences as any)?.avoidWeekends
        ? DEFAULT_WEIGHTS.weekendPenalty * 1.5
        : DEFAULT_WEIGHTS.weekendPenalty,
    }

    const scoreResult = await calculateParkDateScore(parkId, params.date, weights, {
      startDate: trip.start_date,
      endDate: trip.end_date,
      previousParkId,
      heavyParks: [],
    })

    return NextResponse.json(scoreResult)
  } catch (error) {
    console.error("Error calculating score:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
