"use client"

import { useParkCalendar } from "@/lib/hooks/useParkCalendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { format, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"

interface CrowdForecastProps {
    parkId: string
}

export function CrowdForecast({ parkId }: CrowdForecastProps) {
    const today = new Date()
    const startDate = today.toISOString().split("T")[0]
    const endDate = addDays(today, 6).toISOString().split("T")[0] // Next 7 days

    const { data: calendar, isLoading } = useParkCalendar(parkId, startDate, endDate)

    if (isLoading) {
        return <Skeleton className="h-[400px] w-full rounded-xl" />
    }

    const getCrowdColor = (percentage: number) => {
        if (percentage < 30) return "bg-green-500"
        if (percentage < 60) return "bg-yellow-500"
        if (percentage < 80) return "bg-orange-500"
        return "bg-red-500"
    }

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Previsão de Lotação (7 Dias)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {calendar?.map((day) => {
                        const crowd = day.crowdPercent || 0
                        return (
                            <div key={day.date} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                <div>
                                    <div className="font-medium capitalize">
                                        {format(new Date(day.date), "EEEE", { locale: ptBR })}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {format(new Date(day.date), "d 'of' MMM", { locale: ptBR })}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <div className="font-bold">{crowd}%</div>
                                        <div className="text-[10px] text-muted-foreground">{day.openTimeLocal} - {day.closeTimeLocal}</div>
                                    </div>
                                    <div className={`w-2 h-10 rounded-full ${getCrowdColor(crowd)}/80`} />
                                </div>
                            </div>
                        )
                    })}

                    {!calendar?.length && (
                        <div className="text-center text-muted-foreground py-8">
                            Previsão indisponível.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
