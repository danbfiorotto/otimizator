import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/db/supabaseServer"
import { getTripsByGroup, createTrip } from "@/lib/db/queries"
import { z } from "zod"

const createTripSchema = z.object({
  groupId: z.string().uuid(),
  name: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  destination: z.string().default("Orlando"),
  preferences: z.record(z.unknown()).default({}),
})

/**
 * GET /api/trips - Lista viagens do grupo do usuário
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Busca grupos do usuário
    const { data: groupMembers } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)

    if (!groupMembers || groupMembers.length === 0) {
      return NextResponse.json([])
    }

    const groupIds = groupMembers.map((gm) => gm.group_id)
    const allTrips = []

    for (const groupId of groupIds) {
      const trips = await getTripsByGroup(groupId)
      allTrips.push(...trips)
    }

    return NextResponse.json(allTrips)
  } catch (error) {
    console.error("Error fetching trips:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/trips - Cria nova viagem
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validated = createTripSchema.parse(body)

    // Verifica se usuário é membro do grupo
    const { data: member } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", validated.groupId)
      .eq("user_id", user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })
    }

    const trip = await createTrip({
      group_id: validated.groupId,
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
