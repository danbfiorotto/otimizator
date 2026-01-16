"use client"

import { useState, useEffect } from "react"
import { useParks } from "@/lib/hooks/useParks"
import { DashboardHeader } from "./_components/DashboardHeader"
import { KPIGrid } from "./_components/KPIGrid"
import { WaitTimeChart } from "./_components/WaitTimeChart"
import { LiveAttractionsTable } from "./_components/LiveAttractionsTable"
import { CrowdForecast } from "./_components/CrowdForecast"
import { Loader2 } from "lucide-react"

export default function StatisticsPage() {
    const { data: parks, isLoading } = useParks()
    const [selectedParkId, setSelectedParkId] = useState<string | null>(null)

    // Default to first park
    useEffect(() => {
        if (parks && parks.length > 0 && !selectedParkId) {
            // Prefer Magic Kingdom or the first one
            const defaultPark = parks.find(p => p.slug === "magic-kingdom") || parks[0]
            setSelectedParkId(defaultPark.id)
        }
    }, [parks, selectedParkId])

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!selectedParkId) {
        return <div className="p-8 text-center">Nenhum parque encontrado.</div>
    }

    return (
        <div className="container py-8 px-4 md:px-8 max-w-7xl mx-auto space-y-8">
            <DashboardHeader
                selectedParkId={selectedParkId}
                onParkChange={setSelectedParkId}
            />

            <KPIGrid parkId={selectedParkId} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <WaitTimeChart parkId={selectedParkId} />
                <CrowdForecast parkId={selectedParkId} />
            </div>

            <LiveAttractionsTable parkId={selectedParkId} />

            <div className="text-center text-xs text-muted-foreground mt-8">
                Powered by <a href="https://queue-times.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Queue-Times.com</a>
            </div>
        </div>
    )
}
