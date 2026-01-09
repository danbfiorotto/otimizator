"use client"

import { useQuery } from "@tanstack/react-query"

export type Group = {
  id: string
  name: string
  slug: string | null
  created_at: string
}

async function fetchGroup(): Promise<Group | null> {
  const res = await fetch("/api/groups")
  if (!res.ok) {
    if (res.status === 401) return null
    throw new Error("Failed to fetch group")
  }
  return res.json()
}

export function useGroup() {
  return useQuery({
    queryKey: ["group"],
    queryFn: fetchGroup,
    retry: false,
  })
}
