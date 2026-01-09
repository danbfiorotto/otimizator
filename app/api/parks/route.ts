import { NextResponse } from "next/server"
import { getParks } from "@/lib/db/queries"
import type { ParkDTO } from "@/lib/dto/types"

/**
 * GET /api/parks - Lista todos os parques disponíveis
 */
export async function GET() {
  try {
    const parks = await getParks()
    const dtos: ParkDTO[] = parks.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      timezone: p.timezone,
    }))

    return NextResponse.json(dtos, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    })
  } catch (error) {
    console.error("Error fetching parks:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
