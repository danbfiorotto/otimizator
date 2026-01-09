"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import type { WizardData } from "./TripWizard"

type Props = {
  data: Partial<WizardData>
  updateData: (updates: Partial<WizardData>) => void
}

export function StepPreferences({ data, updateData }: Props) {
  const preferences = data.preferences || {}

  const updatePreference = (key: string, value: unknown) => {
    updateData({
      preferences: {
        ...preferences,
        [key]: value,
      },
    })
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Preferências da Viagem</h3>
      <p className="text-sm text-muted-foreground">
        Configure suas preferências para otimizar o planejamento
      </p>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ritmo</CardTitle>
            <CardDescription>Como você prefere o ritmo da viagem?</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={preferences.pace || "moderate"}
              onValueChange={(value) =>
                updatePreference("pace", value as "relaxed" | "moderate" | "intense")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relaxed">Relaxado</SelectItem>
                <SelectItem value="moderate">Moderado</SelectItem>
                <SelectItem value="intense">Intenso</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dias de Descanso</CardTitle>
            <CardDescription>Quantos dias de descanso você deseja?</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              min="0"
              value={preferences.restDays || 0}
              onChange={(e) =>
                updatePreference("restDays", parseInt(e.target.value) || 0)
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sequência de Parques Pesados</CardTitle>
            <CardDescription>
              Máximo de dias seguidos com parques intensos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              min="1"
              value={preferences.maxHeavyStreak || 2}
              onChange={(e) =>
                updatePreference("maxHeavyStreak", parseInt(e.target.value) || 2)
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Viagem com Crianças</CardTitle>
            <CardDescription>
              A viagem inclui crianças?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={preferences.hasKids ? "yes" : "no"}
              onValueChange={(value) =>
                updatePreference("hasKids", value === "yes")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">Não</SelectItem>
                <SelectItem value="yes">Sim</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evitar Fins de Semana</CardTitle>
            <CardDescription>
              Preferir evitar sábados e domingos para parques selecionados?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="avoidWeekends"
                checked={preferences.avoidWeekends || false}
                onCheckedChange={(checked) =>
                  updatePreference("avoidWeekends", checked)
                }
              />
              <Label htmlFor="avoidWeekends" className="cursor-pointer">
                Evitar fins de semana quando possível
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horário Típico de Chegada</CardTitle>
            <CardDescription>
              Que horas você costuma chegar aos parques? (Rope drop ou mais tarde)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={preferences.typicalArrivalTime || "rope-drop"}
              onValueChange={(value) =>
                updatePreference("typicalArrivalTime", value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rope-drop">Rope Drop (abertura do parque)</SelectItem>
                <SelectItem value="early">Manhã cedo (9h-10h)</SelectItem>
                <SelectItem value="mid-morning">Meio da manhã (10h-11h)</SelectItem>
                <SelectItem value="afternoon">Tarde (12h-14h)</SelectItem>
                <SelectItem value="flexible">Flexível</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
