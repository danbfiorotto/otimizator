"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioIcon } from "lucide-react"

export function LiveModeBanner() {
  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <RadioIcon className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <div className="font-semibold">Modo Ao Vivo</div>
            <div className="text-sm text-muted-foreground">
              Os dados são atualizados automaticamente a cada 5 minutos
            </div>
          </div>
          <Badge variant="default">Ativo</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
