"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export type Group = {
  id: string
  name: string
  owner_user_id: string
  created_at: string
}

async function fetchGroups(): Promise<Group[]> {
  const res = await fetch("/api/groups")
  if (!res.ok) throw new Error("Failed to fetch groups")
  return res.json()
}

async function createGroup(name: string): Promise<Group> {
  const res = await fetch("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to create group")
  }
  return res.json()
}

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: fetchGroups,
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] })
    },
  })
}
