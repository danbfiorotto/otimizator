"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import type { DayPlanRequest } from "@/lib/dto/types"

type Props = {
  fixedItems?: DayPlanRequest["fixedItems"]
  onChange: (items: DayPlanRequest["fixedItems"]) => void
}

export function FixedWindowsManager({ fixedItems = [], onChange }: Props) {
  const addFixedItem = () => {
    onChange([
      ...(fixedItems || []),
      {
        type: "show",
        title: "",
        startTimeLocal: "14:00",
        endTimeLocal: "15:00",
      },
    ])
  }

  const removeFixedItem = (index: number) => {
    onChange(fixedItems?.filter((_, i) => i !== index) || [])
  }

  const updateFixedItem = (index: number, updates: Partial<NonNullable<DayPlanRequest["fixedItems"]>[0]>) => {
    const updated = [...(fixedItems || [])]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Janelas Fixas</CardTitle>
        <CardDescription className="text-xs">
          Adicione shows, almoços ou outros compromissos com horários fixos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fixedItems && fixedItems.length > 0 && (
          <div className="space-y-3">
            {fixedItems.map((item, index) => (
              <div key={index} className="border rounded p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Item {index + 1}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFixedItem(index)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <Label htmlFor={`type-${index}`} className="text-xs">
                    Tipo
                  </Label>
                  <Select
                    value={item.type}
                    onValueChange={(value) =>
                      updateFixedItem(index, { type: value as "show" | "meal" })
                    }
                  >
                    <SelectTrigger id={`type-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="show">Show</SelectItem>
                      <SelectItem value="meal">Refeição</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`title-${index}`} className="text-xs">
                    Título
                  </Label>
                  <Input
                    id={`title-${index}`}
                    value={item.title}
                    onChange={(e) => updateFixedItem(index, { title: e.target.value })}
                    placeholder="Ex: Almoço, Show da Fantasia, etc."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={`start-${index}`} className="text-xs">
                      Início
                    </Label>
                    <Input
                      id={`start-${index}`}
                      type="time"
                      value={item.startTimeLocal}
                      onChange={(e) =>
                        updateFixedItem(index, { startTimeLocal: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`end-${index}`} className="text-xs">
                      Fim
                    </Label>
                    <Input
                      id={`end-${index}`}
                      type="time"
                      value={item.endTimeLocal}
                      onChange={(e) =>
                        updateFixedItem(index, { endTimeLocal: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addFixedItem}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Janela Fixa
        </Button>
      </CardContent>
    </Card>
  )
}
