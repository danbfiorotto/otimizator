"use client"

import { AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

type Props = {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorAlert({ title = "Erro", message, onRetry }: Props) {
  return (
    <Card className="border-destructive">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
