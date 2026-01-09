import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/db/supabaseServer"
import { getGroupSession } from "@/lib/utils/session"
import { upsertTripDay, getTripDayAssignment, upsertTripDayAssignment } from "@/lib/db/queries"
import { z } from "zod"

const assignmentSchema = z.object({
  parkId: z.string().uuid().nullable(),
  isLocked: z.boolean().optional().default(false),
})

/**
 * GET /api/trips/[tripId]/days/[date]/assignment - Retorna o parque atribuído ao dia
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
      .select("id, group_id")
      .eq("id", params.tripId)
      .eq("group_id", groupId)
      .single()

    if (tripError || !trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    }

    // Get trip day
    const { data: tripDay, error: dayError } = await supabase
      .from("trip_days")
      .select("id")
      .eq("trip_id", params.tripId)
      .eq("date", params.date)
      .single()

    if (dayError || !tripDay) {
      return NextResponse.json({ parkId: null, isLocked: false })
    }

    // Get assignment
    const assignment = await getTripDayAssignment(tripDay.id)

    if (!assignment) {
      return NextResponse.json({ parkId: null, isLocked: false })
    }

    return NextResponse.json({ 
      parkId: assignment.park_id, 
      isLocked: assignment.is_locked 
    })
  } catch (error) {
    console.error("Error fetching assignment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/trips/[tripId]/days/[date]/assignment - Salva o parque atribuído ao dia
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

    const body = await request.json()
    const validated = assignmentSchema.parse(body)

    // Ensure trip day exists
    const tripDay = await upsertTripDay({
      trip_id: params.tripId,
      date: params.date,
    })

    // Upsert assignment
    const assignment = await upsertTripDayAssignment({
      trip_day_id: tripDay.id,
      park_id: validated.parkId,
      is_locked: validated.isLocked,
      source: "user",
      score_breakdown: {},
    })

    return NextResponse.json({ 
      parkId: assignment.park_id, 
      isLocked: assignment.is_locked 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error saving assignment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
