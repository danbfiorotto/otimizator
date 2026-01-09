"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { WizardData } from "./TripWizard"

type Props = {
  data: Partial<WizardData>
  updateData: (updates: Partial<WizardData>) => void
}

export function StepDates({ data, updateData }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Informações Básicas</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Viagem</Label>
            <Input
              id="name"
              placeholder="Ex: Férias em Orlando 2024"
              value={data.name || ""}
              onChange={(e) => updateData({ name: e.target.value })}
            />
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
        <h3 className="text-lg font-semibold mb-4">Datas</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Data de Início</Label>
            <Input
              id="startDate"
              type="date"
              value={data.startDate || ""}
              onChange={(e) => updateData({ startDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="endDate">Data de Término</Label>
            <Input
              id="endDate"
              type="date"
              value={data.endDate || ""}
              onChange={(e) => updateData({ endDate: e.target.value })}
              min={data.startDate}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
