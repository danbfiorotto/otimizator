"use client"

import { useState, useEffect } from "react"
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDayPlan } from "@/lib/hooks/useDayPlan"
import type { DayPlanResponse } from "@/lib/dto/types"
import { Skeleton } from "@/components/ui/skeleton"
import { TimelineItem } from "./TimelineItem"
import { MetricsCard } from "./MetricsCard"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RefreshCw, Download, RadioIcon, FileText, Image, FileDown, AlertCircle, CheckCircle2, CheckCircle } from "lucide-react"
import { useReplan } from "@/lib/hooks/useReplan"
import { useParkLive } from "@/lib/hooks/useParkLive"
import { useToast } from "@/components/ui/use-toast"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { exportAsImage, exportAsPDF, exportAsText } from "@/lib/utils/export"
import { Badge } from "@/components/ui/badge"
import { useQueryClient } from "@tanstack/react-query"
import Link from "next/link"

type Props = {
  tripId: string
  date: string
}

export function TimelineView({ tripId, date }: Props) {
  const { data: plan, isLoading } = useDayPlan(tripId, date)
  const { mutate: replan, isPending: isReplanning } = useReplan()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [liveMode, setLiveMode] = useState(false)
  const [isSavingFinal, setIsSavingFinal] = useState(false)
  const [fixedItemIds, setFixedItemIds] = useState<Set<number>>(new Set())
  const [reorderedItems, setReorderedItems] = useState<DayPlanResponse["items"] | null>(null)
  const parkId = plan?.parkId || ""
  
  // Use reordered items if available, otherwise use plan items
  const displayItems = reorderedItems || plan?.items || []
  
  // Fetch live data when live mode is active
  const { data: liveData = [], isLoading: liveDataLoading } = useParkLive(
    parkId,
    liveMode && !!parkId
  )
  
  // Create map of live data for quick lookup
  const liveDataMap = new Map(
    liveData.map((item) => [item.attractionId, item])
  )
  
  // Compare plan with live data and generate suggestions
  const suggestions = plan && liveData.length > 0
    ? plan.items
        .filter((item) => item.attractionId)
        .map((item) => {
          const live = liveDataMap.get(item.attractionId!)
          if (!live) return null
          
          const plannedWait = item.expectedWait || 0
          const currentWait = live.waitMinutes
          const isClosed = !live.isOpen
          const significantChange = Math.abs(currentWait - plannedWait) > 15
          
          if (isClosed || (significantChange && currentWait < plannedWait - 15)) {
            return {
              item,
              live,
              suggestion: isClosed
                ? "Fechada"
                : `Caiu para ${currentWait} min (era ${plannedWait} min)`,
              type: isClosed ? "closed" : "improved" as const,
            }
          }
          
          return null
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)
    : []

  const handleReplan = () => {
    replan(
      { tripId, date },
      {
        onSuccess: () => {
          toast({
            title: "Replano concluído",
            description: "O plano foi atualizado com dados ao vivo",
          })
        },
        onError: (error: Error) => {
          toast({
            title: "Erro",
            description: error.message,
            variant: "destructive",
          })
        },
      }
    )
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || !plan) return

    const activeId = active.id as number
    const overId = over.id as number

    if (activeId === overId) return

    // Don't allow dragging fixed items
    if (fixedItemIds.has(activeId) || fixedItemIds.has(overId)) {
      toast({
        title: "Item fixo",
        description: "Itens fixos não podem ser movidos",
        variant: "destructive",
      })
      return
    }

    const items = [...displayItems]
    const activeIndex = items.findIndex((item) => item.orderIndex === activeId)
    const overIndex = items.findIndex((item) => item.orderIndex === overId)

    if (activeIndex === -1 || overIndex === -1) return

    const [removed] = items.splice(activeIndex, 1)
    items.splice(overIndex, 0, removed)

    // Update order indices
    const reordered = items.map((item, index) => ({
      ...item,
      orderIndex: index,
    }))

    setReorderedItems(reordered)
  }

  const handleToggleFixed = (orderIndex: number) => {
    setFixedItemIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(orderIndex)) {
        newSet.delete(orderIndex)
      } else {
        newSet.add(orderIndex)
      }
      return newSet
    })
  }

  const handleSaveFinal = async () => {
    if (!plan) return

    setIsSavingFinal(true)
    try {
      const res = await fetch(`/api/trips/${tripId}/days/${date}/plan/final`, {
        method: "PATCH",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to save as final")
      }

      // Invalidate queries to refresh
      queryClient.invalidateQueries({
        queryKey: ["trips", tripId, "days", date, "plan"],
      })

      toast({
        title: "Plano salvo",
        description: "O plano foi marcado como final",
      })
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o plano",
        variant: "destructive",
      })
    } finally {
      setIsSavingFinal(false)
    }
  }

  const handleExport = async (exportFormat: "image" | "pdf" | "text") => {
    if (!plan) return

    try {
      const dateFormatted = format(parseISO(date), "dd-MM-yyyy", { locale: ptBR })
      const filenameBase = `plano-${dateFormatted}`

      if (exportFormat === "text") {
        exportAsText(plan, `${filenameBase}.txt`)
        toast({
          title: "Exportado",
          description: "Plano exportado como texto",
        })
        return
      }

      // Para imagem e PDF, precisamos esperar o próximo render para ter o elemento
      setTimeout(async () => {
        try {
          const timelineId = `timeline-${tripId}-${date}`
          
          if (exportFormat === "image") {
            await exportAsImage(timelineId, `${filenameBase}.png`)
            toast({
              title: "Exportado",
              description: "Plano exportado como imagem",
            })
          } else if (exportFormat === "pdf") {
            await exportAsPDF(
              timelineId,
              `${filenameBase}.pdf`,
              `Plano do Dia - ${dateFormatted}`
            )
            toast({
              title: "Exportado",
              description: "Plano exportado como PDF",
            })
          }
        } catch (error: any) {
          toast({
            title: "Erro na exportação",
            description: error.message || "Não foi possível exportar. Certifique-se de que as dependências estão instaladas.",
            variant: "destructive",
          })
        }
      }, 100)
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível exportar",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return <Skeleton className="h-96" />
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Nenhum plano encontrado</h2>
        <p className="text-muted-foreground">
          Gere um plano primeiro na página de planejamento
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Timeline do Dia</h2>
          <Button
            variant="link"
            className="p-0 h-auto text-sm"
            asChild
          >
            <Link href={`/app/trips/${tripId}/days/${date}/summary`}>
              Ver Resumo do Dia
            </Link>
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={liveMode ? "default" : "outline"}
            onClick={() => setLiveMode(!liveMode)}
          >
            <RadioIcon className="mr-2 h-4 w-4" />
            Modo Ao Vivo
          </Button>
          <Button variant="outline" onClick={handleReplan} disabled={isReplanning}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isReplanning ? "animate-spin" : ""}`} />
            Replan Agora
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveFinal}
            disabled={isSavingFinal || !plan}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {isSavingFinal ? "Salvando..." : "Salvar como Plano Final"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar como PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("image")}>
                <Image className="mr-2 h-4 w-4" />
                Exportar como Imagem
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("text")}>
                <FileText className="mr-2 h-4 w-4" />
                Exportar como Texto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {liveMode && (
        <>
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RadioIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    Modo ao vivo ativo - dados atualizados a cada 5 minutos
                    {liveDataLoading && " (atualizando...)"}
                  </span>
                </div>
                {suggestions.length > 0 && (
                  <Badge variant="destructive">
                    {suggestions.length} mudança{suggestions.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
          
          {suggestions.length > 0 && (
            <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Sugestões Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between p-2 rounded border bg-background"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{suggestion.item.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {suggestion.suggestion}
                        </div>
                        {suggestion.type === "closed" && (
                          <Badge variant="destructive" className="mt-1 text-xs">
                            Fechada
                          </Badge>
                        )}
                        {suggestion.type === "improved" && (
                          <Badge variant="default" className="mt-1 text-xs bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Melhorou
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card id={`timeline-${tripId}-${date}`}>
            <CardHeader>
              <CardTitle>Itinerário</CardTitle>
            </CardHeader>
            <CardContent>
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={displayItems.map((item) => item.orderIndex)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {displayItems.map((item) => {
                      const live = item.attractionId ? liveDataMap.get(item.attractionId) : undefined
                      const suggestion = suggestions.find((s) => s.item.attractionId === item.attractionId)
                      const isFixed = fixedItemIds.has(item.orderIndex)
                      
                      return (
                        <TimelineItem 
                          key={item.orderIndex} 
                          item={item}
                          liveData={live ?? undefined}
                          hasSuggestion={!!suggestion}
                          isFixed={isFixed}
                          onToggleFixed={() => handleToggleFixed(item.orderIndex)}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
        </div>
        <div>
          <MetricsCard metrics={plan.metrics} />
        </div>
      </div>
    </div>
  )
}
