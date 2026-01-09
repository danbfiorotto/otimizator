import { cookies } from "next/headers"

const GROUP_SESSION_COOKIE = "otimizator_group_session"
const GROUP_ID_COOKIE = "otimizator_group_id"

/**
 * Set group session cookies
 */
export async function setGroupSession(groupId: string) {
  const cookieStore = await cookies()
  cookieStore.set(GROUP_ID_COOKIE, groupId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  })
  cookieStore.set(GROUP_SESSION_COOKIE, "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  })
}

/**
 * Get current group ID from session
 */
export async function getGroupSession(): Promise<string | null> {
  const cookieStore = await cookies()
  const groupId = cookieStore.get(GROUP_ID_COOKIE)?.value
  const session = cookieStore.get(GROUP_SESSION_COOKIE)?.value

  if (session === "authenticated" && groupId) {
    return groupId
  }

  return null
}

/**
 * Clear group session
 */
export async function clearGroupSession() {
  const cookieStore = await cookies()
  cookieStore.delete(GROUP_ID_COOKIE)
  cookieStore.delete(GROUP_SESSION_COOKIE)
}
