"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
} from "recharts"

type Props = {
  data: Array<{
    hour: number
    dow: number
    value: number
  }>
  title: string
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#ff0000"]

export function HeatmapChart({ data, title }: Props) {
  // Transform data for Recharts scatter plot (heatmap-like)
  const chartData = data.map((d) => ({
    x: d.hour,
    y: d.dow,
    value: d.value,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="Hora"
              domain={[0, 23]}
              label={{ value: "Hora", position: "insideBottom", offset: -5 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Dia"
              domain={[0, 6]}
              label={{ value: "Dia da Semana", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-background border rounded p-2">
                      <p>Hora: {data.x}:00</p>
                      <p>Dia: {data.y}</p>
                      <p>Valor: {data.value}</p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Scatter name="Heatmap" data={chartData} fill="#8884d8">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[Math.min(Math.floor(entry.value * 5), 4)]} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
