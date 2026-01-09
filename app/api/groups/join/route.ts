import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/db/supabaseServer"
import { verifyPassword } from "@/lib/utils/password"
import { setGroupSession } from "@/lib/utils/session"
import { z } from "zod"

const joinGroupSchema = z.object({
  groupId: z.string().uuid().optional(),
  slug: z.string().optional(),
  password: z.string().min(1),
})

/**
 * POST /api/groups/join - Entra em um grupo usando senha
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = joinGroupSchema.parse(body)

    if (!validated.groupId && !validated.slug) {
      return NextResponse.json(
        { error: "groupId or slug is required" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Find group by ID or slug
    let query = supabase.from("groups").select("id, name, password_hash, slug")

    if (validated.groupId) {
      query = query.eq("id", validated.groupId)
    } else if (validated.slug) {
      query = query.eq("slug", validated.slug)
    }

    const { data: group, error } = await query.single()

    if (error || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    // Verify password
    const isValid = await verifyPassword(validated.password, group.password_hash)

    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    // Set session
    await setGroupSession(group.id)

    return NextResponse.json({
      id: group.id,
      name: group.name,
      slug: group.slug,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error joining group:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
