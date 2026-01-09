"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ReactNode } from "react"

type Props = {
  tripId: string
  defaultTab?: string
  children: {
    calendar: ReactNode
    stats?: ReactNode
    settings?: ReactNode
  }
}

export function TripTabs({ tripId, defaultTab = "calendar", children }: Props) {
  return (
    <Tabs defaultValue={defaultTab} className="mt-6">
      <TabsList>
        <TabsTrigger value="calendar">Calendário</TabsTrigger>
        <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        <TabsTrigger value="settings">Configurações</TabsTrigger>
      </TabsList>
      <TabsContent value="calendar" className="mt-6">
        {children.calendar}
      </TabsContent>
      <TabsContent value="stats" className="mt-6">
        {children.stats || <div>Estatísticas em breve</div>}
      </TabsContent>
      <TabsContent value="settings" className="mt-6">
        {children.settings || <div>Configurações em breve</div>}
      </TabsContent>
    </Tabs>
  )
}
