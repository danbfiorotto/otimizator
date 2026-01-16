"use client"

import { useParks } from "@/lib/hooks/useParks"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

interface DashboardHeaderProps {
    selectedParkId: string | null
    onParkChange: (parkId: string) => void
}

export function DashboardHeader({
    selectedParkId,
    onParkChange,
}: DashboardHeaderProps) {
    const { data: parks, isLoading } = useParks()

    // Ensure we sort parks alphabetically for better UX
    const sortedParks = parks?.slice().sort((a, b) => a.name.localeCompare(b.name))

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Estatísticas</h1>
                <p className="text-muted-foreground mt-1">
                    Análise detalhada e tempo real dos parques
                </p>
            </div>

            <div className="w-full md:w-[300px]">
                {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <Select
                        value={selectedParkId || ""}
                        onValueChange={onParkChange}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione um parque" />
                        </SelectTrigger>
                        <SelectContent>
                            {sortedParks?.map((park) => (
                                <SelectItem key={park.id} value={park.id}>
                                    {park.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
        </div>
    )
}
