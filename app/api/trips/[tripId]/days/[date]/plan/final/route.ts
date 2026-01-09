import { NextRequest, NextResponse } from "next/server"
import { getGroupSession } from "@/lib/utils/session"
import { createServiceClient } from "@/lib/db/supabaseServer"
import { getTripDays, getDayPlan, updateDayPlanStatus } from "@/lib/db/queries"

/**
 * PATCH /api/trips/[tripId]/days/[date]/plan/final - Marca plano como final
 */
export async function PATCH(
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
      .select("id, group_id")
      .eq("id", params.tripId)
      .eq("group_id", groupId)
      .single()

    if (tripError || !trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    }

    // Get trip day
    const tripDays = await getTripDays(params.tripId)
    const tripDay = tripDays.find((d) => d.date === params.date)

    if (!tripDay) {
      return NextResponse.json({ error: "Trip day not found" }, { status: 404 })
    }

    // Get latest plan
    const plan = await getDayPlan(tripDay.id)
    if (!plan) {
      return NextResponse.json({ error: "No plan found for this day" }, { status: 404 })
    }

    // Update status to final
    const updatedPlan = await updateDayPlanStatus(tripDay.id, plan.version, "final")

    return NextResponse.json(updatedPlan)
  } catch (error) {
    console.error("Error marking plan as final:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
