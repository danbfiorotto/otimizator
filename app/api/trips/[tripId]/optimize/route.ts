import { NextRequest, NextResponse } from "next/server"
import { optimizeParkDays } from "@/lib/planner/parkDayOptimizer"
import { tripOptimizeRequestSchema, isValidTripOptimizeRequest } from "@/lib/dto/zod"
import { getGroupSession } from "@/lib/utils/session"
import { createServiceClient } from "@/lib/db/supabaseServer"
import { upsertTripDay, upsertTripDayAssignment } from "@/lib/db/queries"

/**
 * POST /api/trips/[tripId]/optimize - Otimiza parques por dia
 * Query params: ?autoSave=true para salvar automaticamente os resultados
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
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
    }

    if (!isValidTripOptimizeRequest(requestData)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const result = await optimizeParkDays(requestData)
    
    // Auto-save if requested via query parameter
    const searchParams = request.nextUrl.searchParams
    const autoSave = searchParams.get("autoSave") === "true"
    
    if (autoSave && result.assignments) {
      // Save all assignments in parallel
      const savePromises = result.assignments.map(async (assignment) => {
        try {
          // Ensure trip day exists
          const tripDay = await upsertTripDay({
            trip_id: params.tripId,
            date: assignment.date,
          })
          
          // Save assignment with score breakdown
          await upsertTripDayAssignment({
            trip_day_id: tripDay.id,
            park_id: assignment.parkId,
            is_locked: false,
            source: "optimizer",
            score_breakdown: assignment.breakdown || {},
          })
        } catch (error) {
          console.error(`Error saving assignment for ${assignment.date}:`, error)
          // Continue saving other assignments even if one fails
        }
      })
      
      await Promise.all(savePromises)
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error optimizing trip:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
