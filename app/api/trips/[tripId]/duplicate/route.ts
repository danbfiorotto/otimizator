import { NextRequest, NextResponse } from "next/server"
import { getGroupSession } from "@/lib/utils/session"
import { createServiceClient } from "@/lib/db/supabaseServer"
import { getTripById, createTrip, getTripDays, upsertTripDay, upsertTripDayAssignment } from "@/lib/db/queries"
import { format, parseISO, addDays } from "date-fns"

/**
 * POST /api/trips/[tripId]/duplicate - Duplica uma viagem como template
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

    const supabase = createServiceClient()

    // Verify original trip belongs to group
    const originalTrip = await getTripById(params.tripId)
    if (!originalTrip || originalTrip.group_id !== groupId) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const newStartDate = body.startDate || originalTrip.start_date
    const newEndDate = body.endDate || originalTrip.end_date

    // Create new trip with same preferences
    const newTrip = await createTrip({
      group_id: groupId,
      name: `${originalTrip.name} (Cópia)`,
      start_date: newStartDate,
      end_date: newEndDate,
      destination: originalTrip.destination,
      preferences: originalTrip.preferences,
    })

    // Copy trip days and assignments
    const originalDays = await getTripDays(params.tripId)
    
    for (const originalDay of originalDays) {
      const originalDate = parseISO(originalDay.date)
      const dayIndex = originalDays.findIndex((d) => d.id === originalDay.id)
      const newDate = addDays(parseISO(newStartDate), dayIndex)
      
      // Create new trip day
      const newTripDay = await upsertTripDay({
        trip_id: newTrip.id,
        date: format(newDate, "yyyy-MM-dd"),
      })

      // Copy assignment if exists
      const { data: originalAssignment } = await supabase
        .from("trip_day_assignments")
        .select("*")
        .eq("trip_day_id", originalDay.id)
        .single()

      if (originalAssignment) {
        await upsertTripDayAssignment({
          trip_day_id: newTripDay.id,
          park_id: originalAssignment.park_id,
          is_locked: false, // Don't lock duplicated assignments
          source: "user",
          score_breakdown: {},
        })
      }
    }

    return NextResponse.json(newTrip, { status: 201 })
  } catch (error) {
    console.error("Error duplicating trip:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
