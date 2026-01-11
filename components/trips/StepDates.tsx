"use client"

import { useState } from "react"
import { parseISO, format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import type { WizardData } from "./TripWizard"

type Props = {
  data: Partial<WizardData>
  updateData: (updates: Partial<WizardData>) => void
}

export function StepDates({ data, updateData }: Props) {
  const startDate = data.startDate ? parseISO(data.startDate) : undefined
  const endDate = data.endDate ? parseISO(data.endDate) : undefined
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      updateData({ startDate: format(date, "yyyy-MM-dd") })
      // Se a data de término for anterior à nova data de início, ajustar
      if (endDate && date > endDate) {
        updateData({ endDate: format(date, "yyyy-MM-dd") })
      }
    } else {
      updateData({ startDate: undefined })
    }
  }

  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      updateData({ endDate: format(date, "yyyy-MM-dd") })
    } else {
      updateData({ endDate: undefined })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Informações Básicas</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Viagem *</Label>
            <Input
              id="name"
              placeholder="Ex: Férias em Orlando 2024"
              value={data.name || ""}
              onChange={(e) => updateData({ name: e.target.value })}
            />
            {!data.name && (
              <p className="text-xs text-muted-foreground mt-1">
                Obrigatório
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="destination">Destino</Label>
            <Input
              id="destination"
              placeholder="Orlando"
              value={data.destination || "Orlando"}
              onChange={(e) => updateData({ destination: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Datas da Viagem</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Data de Início *</Label>
            <DatePicker
              value={startDate}
              onChange={handleStartDateChange}
              placeholder="dd/mm/aaaa"
              minDate={today}
            />
            {!data.startDate && (
              <p className="text-xs text-muted-foreground mt-1">
                Obrigatório
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="endDate">Data de Término *</Label>
            <DatePicker
              value={endDate}
              onChange={handleEndDateChange}
              placeholder="dd/mm/aaaa"
              minDate={startDate || today}
            />
            {!data.endDate && (
              <p className="text-xs text-muted-foreground mt-1">
                Obrigatório
              </p>
            )}
          </div>
        </div>
        {data.startDate && data.endDate && startDate && endDate && startDate > endDate && (
          <p className="text-xs text-destructive mt-2">
            A data de término deve ser posterior à data de início
          </p>
        )}
      </div>
    </div>
  )
}
