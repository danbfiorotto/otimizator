import { NextRequest, NextResponse } from "next/server"
import { getTripById } from "@/lib/db/queries"

/**
 * GET /api/trips/[tripId] - Detalhes de uma viagem
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const trip = await getTripById(params.tripId)
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    }

    return NextResponse.json(trip)
  } catch (error) {
    console.error("Error fetching trip:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
