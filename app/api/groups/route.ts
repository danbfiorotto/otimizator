import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/db/supabaseServer"
import { hashPassword } from "@/lib/utils/password"
import { setGroupSession, getGroupSession } from "@/lib/utils/session"
import { z } from "zod"

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  password: z.string().min(4).max(50),
})

/**
 * GET /api/groups - Retorna o grupo atual da sessão
 */
export async function GET(request: NextRequest) {
  try {
    const groupId = await getGroupSession()

    if (!groupId) {
      return NextResponse.json({ error: "No active group session" }, { status: 401 })
    }

    const supabase = createServiceClient()
    const { data: group, error } = await supabase
      .from("groups")
      .select("id, name, slug, created_at")
      .eq("id", groupId)
      .single()

    if (error || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    return NextResponse.json(group)
  } catch (error) {
    console.error("Error fetching group:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/groups - Cria novo grupo com senha
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = createGroupSchema.parse(body)

    const supabase = createServiceClient()

    // Generate slug
    const baseSlug = validated.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    let slug = baseSlug
    let counter = 0
    while (true) {
      const { data: existing } = await supabase
        .from("groups")
        .select("id")
        .eq("slug", slug)
        .single()
      if (!existing) break
      counter++
      slug = `${baseSlug}-${counter}`
    }

    // Hash password
    const passwordHash = await hashPassword(validated.password)

    // Create group
    const { data: newGroup, error: groupError } = await supabase
      .from("groups")
      .insert({
        name: validated.name,
        password_hash: passwordHash,
        slug,
      })
      .select("id, name, slug, created_at")
      .single()

    if (groupError) throw groupError

    // Set session
    await setGroupSession(newGroup.id)

    return NextResponse.json(newGroup, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating group:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
