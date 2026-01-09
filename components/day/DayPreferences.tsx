"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Props = {
  preferences: {
    arrivalTime: string
    lunchWindow?: { start: string; end: string }
    walkMinutesDefault: number
    mode: "p50" | "p80"
  }
  onPreferencesChange: (preferences: Props["preferences"]) => void
}

export function DayPreferences({ preferences, onPreferencesChange }: Props) {
  const updatePreference = (key: string, value: unknown) => {
    onPreferencesChange({
      ...preferences,
      [key]: value,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferências do Dia</CardTitle>
        <CardDescription>
          Configure horários e preferências para o planejamento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="arrivalTime">Hora de Chegada</Label>
          <Input
            id="arrivalTime"
            type="time"
            value={preferences.arrivalTime}
            onChange={(e) => updatePreference("arrivalTime", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="lunchStart">Início do Almoço</Label>
            <Input
              id="lunchStart"
              type="time"
              value={preferences.lunchWindow?.start || "12:00"}
              onChange={(e) =>
                updatePreference("lunchWindow", {
                  start: e.target.value,
                  end: preferences.lunchWindow?.end || "13:00",
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="lunchEnd">Fim do Almoço</Label>
            <Input
              id="lunchEnd"
              type="time"
              value={preferences.lunchWindow?.end || "13:00"}
              onChange={(e) =>
                updatePreference("lunchWindow", {
                  start: preferences.lunchWindow?.start || "12:00",
                  end: e.target.value,
                })
              }
            />
          </div>
        </div>
        <div>
          <Label htmlFor="walkTime">Tempo de Caminhada Padrão (minutos)</Label>
          <Input
            id="walkTime"
            type="number"
            min="5"
            max="30"
            value={preferences.walkMinutesDefault}
            onChange={(e) =>
              updatePreference("walkMinutesDefault", parseInt(e.target.value) || 10)
            }
          />
        </div>
        <div>
          <Label htmlFor="mode">Modo de Planejamento</Label>
          <Select
            value={preferences.mode}
            onValueChange={(value) => updatePreference("mode", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="p50">P50 (Otimista)</SelectItem>
              <SelectItem value="p80">P80 (Conservador)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
