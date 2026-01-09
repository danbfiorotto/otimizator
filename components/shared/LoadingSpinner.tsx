"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function LoadingSpinner({ className, size = "md" }: Props) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  return (
    <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
  )
}
