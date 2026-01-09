"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useParks } from "@/lib/hooks/useParks"
import { useAttractions } from "@/lib/hooks/useAttractions"
import { Skeleton } from "@/components/ui/skeleton"
import type { AttractionDTO } from "@/lib/dto/types"

type Props = {
  parkId: string
  onSelectionChange: (mustDo: string[], want: string[], optional: string[]) => void
}

export function AttractionPicker({ parkId, onSelectionChange }: Props) {
  const [mustDo, setMustDo] = useState<string[]>([])
  const [want, setWant] = useState<string[]>([])
  const [optional, setOptional] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const { data: parks } = useParks()
  const park = parks?.find((p) => p.id === parkId)
  const { data: attractions = [], isLoading } = useAttractions(parkId)

  useEffect(() => {
    // Notify parent when selections change
    onSelectionChange(mustDo, want, optional)
  }, [mustDo, want, optional, onSelectionChange])

  const toggleAttraction = (
    attractionId: string,
    category: "must" | "want" | "optional"
  ) => {
    const removeFromAll = () => {
      setMustDo((prev) => prev.filter((id) => id !== attractionId))
      setWant((prev) => prev.filter((id) => id !== attractionId))
      setOptional((prev) => prev.filter((id) => id !== attractionId))
    }

    removeFromAll()

    if (category === "must") {
      setMustDo((prev) => [...prev, attractionId])
    } else if (category === "want") {
      setWant((prev) => [...prev, attractionId])
    } else {
      setOptional((prev) => [...prev, attractionId])
    }
  }

  // Filter attractions based on search and type
  const filteredAttractions = attractions.filter((attraction) => {
    const matchesSearch = searchQuery === "" || 
      attraction.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === "all" || 
      (filterType === "ride" && attraction.type === "ride") ||
      (filterType === "show" && attraction.type === "show") ||
      (filterType === "meet" && attraction.type === "meet") ||
      (filterType === "other" && attraction.type && !["ride", "show", "meet"].includes(attraction.type))
    
    return matchesSearch && matchesType && !attraction.isArchived
  })

  const renderAttractionList = (category: "must" | "want" | "optional") => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )
    }

    if (filteredAttractions.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          {searchQuery || filterType !== "all" 
            ? "Nenhuma atração encontrada com os filtros aplicados"
            : "Nenhuma atração disponível"}
        </p>
      )
    }

    return (
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredAttractions.map((attraction) => {
          const isSelected = 
            (category === "must" && mustDo.includes(attraction.id)) ||
            (category === "want" && want.includes(attraction.id)) ||
            (category === "optional" && optional.includes(attraction.id))

          return (
            <div key={attraction.id} className="flex items-center space-x-2">
              <Checkbox
                id={`${category}-${attraction.id}`}
                checked={isSelected}
                onCheckedChange={() => toggleAttraction(attraction.id, category)}
              />
              <Label 
                htmlFor={`${category}-${attraction.id}`} 
                className="cursor-pointer flex-1"
              >
                <div className="flex items-center justify-between">
                  <span>{attraction.name}</span>
                  {attraction.type && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {attraction.type}
                    </span>
                  )}
                </div>
                {attraction.landName && (
                  <span className="text-xs text-muted-foreground block">
                    {attraction.landName}
                  </span>
                )}
              </Label>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atrações</CardTitle>
        <CardDescription>
          Selecione as atrações que deseja visitar e organize por prioridade
          {park && ` - ${park.name}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="space-y-4 mb-4">
          <Input
            placeholder="Buscar atração..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="ride">Atrações (Rides)</SelectItem>
              <SelectItem value="show">Shows</SelectItem>
              <SelectItem value="meet">Encontros</SelectItem>
              <SelectItem value="other">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="must">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="must">
              Must Do ({mustDo.length})
            </TabsTrigger>
            <TabsTrigger value="want">
              Want ({want.length})
            </TabsTrigger>
            <TabsTrigger value="optional">
              Optional ({optional.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="must" className="mt-4">
            {renderAttractionList("must")}
          </TabsContent>
          <TabsContent value="want" className="mt-4">
            {renderAttractionList("want")}
          </TabsContent>
          <TabsContent value="optional" className="mt-4">
            {renderAttractionList("optional")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
