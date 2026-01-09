"use client"

/**
 * Client-side session utilities (for reading cookies in client components)
 */
export function getGroupIdFromCookie(): string | null {
  if (typeof document === "undefined") return null

  const cookies = document.cookie.split(";")
  const groupIdCookie = cookies.find((c) =>
    c.trim().startsWith("otimizator_group_id=")
  )

  if (groupIdCookie) {
    return groupIdCookie.split("=")[1]
  }

  return null
}
