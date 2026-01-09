"use client"

import { useSearchParams } from "next/navigation"
import { JoinGroupForm } from "@/components/groups/JoinGroupForm"
import { Suspense } from "react"

function JoinGroupContent() {
  const searchParams = useSearchParams()
  const groupId = searchParams.get("groupId")
  const slug = searchParams.get("slug")

  return (
    <div className="container py-8 max-w-md mx-auto">
      <JoinGroupForm groupId={groupId || undefined} slug={slug || undefined} />
    </div>
  )
}

export default function JoinGroupPage() {
  return (
    <Suspense fallback={<div className="container py-8">Carregando...</div>}>
      <JoinGroupContent />
    </Suspense>
  )
}
