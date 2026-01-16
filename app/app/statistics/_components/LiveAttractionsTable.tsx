"use client"

import { useState } from "react"
import { useAttractions } from "@/lib/hooks/useAttractions"
import { useParkLive } from "@/lib/hooks/useParkLive"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowUpDown, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LiveAttractionsTableProps {
    parkId: string
}

type SortKey = "name" | "waitMinutes" | "status" | "land"
type SortOrder = "asc" | "desc"

export function LiveAttractionsTable({ parkId }: LiveAttractionsTableProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [sortKey, setSortKey] = useState<SortKey>("waitMinutes")
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

    const { data: attractions, isLoading: isLoadingAttractions } = useAttractions(parkId)
    const { data: liveData, isLoading: isLoadingLive } = useParkLive(parkId)

    const isLoading = isLoadingAttractions || isLoadingLive

    // Merge data
    const combinedData = attractions?.map(attraction => {
        const live = liveData?.find(l => l.attractionId === attraction.id)
        return {
            ...attraction,
            isOpen: live?.isOpen ?? false,
            waitMinutes: live?.waitMinutes ?? 0,
            lastUpdated: live?.lastUpdatedUtc
        }
    }) || []

    // Filter
    const filteredData = combinedData.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.landName?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Sort
    const sortedData = filteredData.sort((a, b) => {
        let aValue: any = a[sortKey as keyof typeof a]
        let bValue: any = b[sortKey as keyof typeof b]

        // Custom sort values
        if (sortKey === "status") {
            aValue = a.isOpen ? 1 : 0
            bValue = b.isOpen ? 1 : 0
        }
        if (sortKey === "land") {
            aValue = a.landName || ""
            bValue = b.landName || ""
        }

        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
        return 0
    })

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
        } else {
            setSortKey(key)
            setSortOrder("desc") // Default to desc for new sort (usually better for wait times)
        }
    }

    if (isLoading) {
        return <Skeleton className="h-[400px] w-full rounded-xl" />
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Status das Atrações</h3>
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar atração..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium">
                            <tr>
                                <th className="p-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => toggleSort("name")}>
                                    <div className="flex items-center gap-1">
                                        Atração
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="p-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => toggleSort("land")}>
                                    <div className="flex items-center gap-1">
                                        Área
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="p-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => toggleSort("status")}>
                                    <div className="flex items-center gap-1">
                                        Status
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="p-4 cursor-pointer hover:text-foreground transition-colors text-right" onClick={() => toggleSort("waitMinutes")}>
                                    <div className="flex items-center gap-1 justify-end">
                                        Fila (min)
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {sortedData.map((item) => (
                                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="p-4 font-medium">{item.name}</td>
                                    <td className="p-4 text-muted-foreground">{item.landName || "-"}</td>
                                    <td className="p-4">
                                        {item.isOpen ? (
                                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                                Aberto
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                                                Fechado
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="p-4 text-right font-mono font-medium text-base">
                                        {item.isOpen ? (
                                            <span className={item.waitMinutes > 60 ? "text-orange-500" : ""}>
                                                {item.waitMinutes}
                                            </span>
                                        ) : "-"}
                                    </td>
                                </tr>
                            ))}
                            {sortedData.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                        Nenhuma atração encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
