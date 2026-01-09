import { NextRequest, NextResponse } from "next/server"
import { getAttractionsByPark } from "@/lib/db/queries"
import type { AttractionDTO } from "@/lib/dto/types"

/**
 * GET /api/parks/[parkId]/attractions - Lista atrações de um parque
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { parkId: string } }
) {
  try {
    const attractions = await getAttractionsByPark(params.parkId)

    const dtos: AttractionDTO[] = attractions.map((a) => ({
      id: a.id,
      parkId: a.park_id,
      name: a.name,
      landName: a.land_name ?? undefined,
      type: a.attraction_type ?? undefined,
      isArchived: a.is_archived,
    }))

    return NextResponse.json(dtos, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    })
  } catch (error) {
    console.error("Error fetching attractions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
