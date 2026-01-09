import { NextRequest, NextResponse } from "next/server"
import { getParkById } from "@/lib/db/queries"
import type { ParkDTO } from "@/lib/dto/types"

/**
 * GET /api/parks/[parkId] - Detalhes de um parque
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { parkId: string } }
) {
  try {
    const park = await getParkById(params.parkId)
    if (!park) {
      return NextResponse.json({ error: "Park not found" }, { status: 404 })
    }

    const dto: ParkDTO = {
      id: park.id,
      slug: park.slug,
      name: park.name,
      timezone: park.timezone,
    }

    return NextResponse.json(dto, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    })
  } catch (error) {
    console.error("Error fetching park:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
