"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useParkLive } from "@/lib/hooks/useParkLive"
import { useParkCalendar } from "@/lib/hooks/useParkCalendar"
import { useAttractions } from "@/lib/hooks/useAttractions"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock, Users, Timer, Activity } from "lucide-react"
import { format } from "date-fns"

interface KPIGridProps {
    parkId: string
}

export function KPIGrid({ parkId }: KPIGridProps) {
    const today = new Date().toISOString().split("T")[0]

    // Fetch data
    const { data: liveData, isLoading: isLoadingLive } = useParkLive(parkId)
    const { data: calendarData, isLoading: isLoadingCalendar } = useParkCalendar(parkId, today, today)
    const { data: attractions, isLoading: isLoadingAttractions } = useAttractions(parkId)

    // Calculate Metrics
    const isLoading = isLoadingLive || isLoadingCalendar || isLoadingAttractions

    const todayCalendar = calendarData?.[0]
    const isOpen = todayCalendar?.openTimeLocal && todayCalendar?.closeTimeLocal
        ? true // Simple check, real logic would check current time vs open/close
        : false

    const operatingHours = todayCalendar?.openTimeLocal && todayCalendar?.closeTimeLocal
        ? `${todayCalendar.openTimeLocal} - ${todayCalendar.closeTimeLocal}`
        : "Fechado"

    const crowdLevel = todayCalendar?.crowdPercent
        ? `${todayCalendar.crowdPercent}%`
        : "N/A"

    // Live Stats calculations
    const totalAttractions = attractions?.length || 0

    const openAttractions = liveData?.filter(a => a.isOpen).length || 0

    // Calculate Avg Wait Time for OPEN rides
    const openRidesWithWait = liveData?.filter(a => a.isOpen && a.waitMinutes >= 0) || []
    const avgWaitTime = openRidesWithWait.length > 0
        ? Math.round(
            openRidesWithWait.reduce((acc, curr) => acc + curr.waitMinutes, 0) / openRidesWithWait.length
        )
        : 0

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-[120px] rounded-xl" />
                ))}
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {/* Operating Hours */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Horário Hoje</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{operatingHours}</div>
                    <p className="text-xs text-muted-foreground">
                        {todayCalendar?.flags?.publicHoliday ? "Feriado Público" : "Horário Regular"}
                    </p>
                </CardContent>
            </Card>

            {/* Crowd Level */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Nível de Lotação</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{crowdLevel}</div>
                    <p className="text-xs text-muted-foreground">
                        Previsão do dia
                    </p>
                </CardContent>
            </Card>

            {/* Avg Wait Time */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tempo Médio Fila</CardTitle>
                    <Timer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{avgWaitTime} min</div>
                    <p className="text-xs text-muted-foreground">
                        Média das atrações abertas
                    </p>
                </CardContent>
            </Card>

            {/* Attraction Status */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Status Atrações</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{openAttractions} / {totalAttractions}</div>
                    <p className="text-xs text-muted-foreground">
                        Atrações operando agora
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
