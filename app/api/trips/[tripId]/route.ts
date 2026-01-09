import { NextRequest, NextResponse } from "next/server"
import { getTripById } from "@/lib/db/queries"
import { getGroupSession } from "@/lib/utils/session"
import { createServiceClient } from "@/lib/db/supabaseServer"

/**
 * GET /api/trips/[tripId] - Detalhes de uma viagem
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const groupId = await getGroupSession()

    if (!groupId) {
      return NextResponse.json({ error: "No active group session" }, { status: 401 })
    }

    const trip = await getTripById(params.tripId)
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    }

    // Verify trip belongs to current group
    if (trip.group_id !== groupId) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    }

    return NextResponse.json(trip)
  } catch (error) {
    console.error("Error fetching trip:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/trips/[tripId] - Deleta uma viagem
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const groupId = await getGroupSession()

    if (!groupId) {
      return NextResponse.json({ error: "No active group session" }, { status: 401 })
    }

    // Verify trip exists and belongs to current group
    const trip = await getTripById(params.tripId)
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    }

    if (trip.group_id !== groupId) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    }

    // Delete trip (cascade will handle related data)
    const supabase = createServiceClient()
    const { error } = await supabase.from("trips").delete().eq("id", params.tripId)

    if (error) {
      console.error("Error deleting trip:", error)
      return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting trip:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
