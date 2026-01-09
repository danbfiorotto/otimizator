import { NextRequest, NextResponse } from "next/server"
import { getTripsByGroup, createTrip } from "@/lib/db/queries"
import { getGroupSession } from "@/lib/utils/session"
import { z } from "zod"

const createTripSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  destination: z.string().default("Orlando"),
  preferences: z.record(z.unknown()).default({}),
})

/**
 * GET /api/trips - Lista viagens do grupo atual
 */
export async function GET(request: NextRequest) {
  try {
    const groupId = await getGroupSession()

    if (!groupId) {
      return NextResponse.json({ error: "No active group session" }, { status: 401 })
    }

    const trips = await getTripsByGroup(groupId)
    return NextResponse.json(trips)
  } catch (error) {
    console.error("Error fetching trips:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/trips - Cria nova viagem no grupo atual
 */
export async function POST(request: NextRequest) {
  try {
    const groupId = await getGroupSession()

    if (!groupId) {
      return NextResponse.json({ error: "No active group session" }, { status: 401 })
    }

    const body = await request.json()
    const validated = createTripSchema.parse(body)

    const trip = await createTrip({
      group_id: groupId,
      name: validated.name,
      start_date: validated.startDate,
      end_date: validated.endDate,
      destination: validated.destination,
      preferences: validated.preferences,
    })

    return NextResponse.json(trip, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 })
    }
    console.error("Error creating trip:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
