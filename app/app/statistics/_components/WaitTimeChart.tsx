"use client"

import { useMemo } from "react"
import { useParkLive } from "@/lib/hooks/useParkLive"
import { useAttractions } from "@/lib/hooks/useAttractions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts"

interface WaitTimeChartProps {
    parkId: string
}

export function WaitTimeChart({ parkId }: WaitTimeChartProps) {
    const { data: attractions } = useAttractions(parkId)
    const { data: liveData, isLoading } = useParkLive(parkId)

    const chartData = useMemo(() => {
        if (!liveData || !attractions) return []

        // Map live data to attraction names
        const data = liveData
            .filter((d) => d.isOpen && d.waitMinutes > 0)
            .map((d) => {
                const attr = attractions.find((a) => a.id === d.attractionId)
                return {
                    name: attr?.name || "Unknown",
                    wait: d.waitMinutes,
                }
            })

        // Sort by wait time desc and take top 10
        return data.sort((a, b) => b.wait - a.wait).slice(0, 10)
    }, [liveData, attractions])

    if (isLoading) {
        return <Skeleton className="h-[400px] w-full rounded-xl" />
    }

    return (
        <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
                <CardTitle>Top 10 Filas (Agora)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={150}
                                    tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                                    interval={0}
                                />
                                <Tooltip
                                    cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--popover))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "8px",
                                        color: "hsl(var(--popover-foreground))",
                                    }}
                                />
                                <Bar dataKey="wait" radius={[0, 4, 4, 0]} barSize={20}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.wait > 60 ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            Sem dados de fila no momento.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
