"use client"

import { TimelineView } from "@/components/timeline/TimelineView"

type Props = {
  params: { tripId: string; date: string }
}

export default function DayPlanPage({ params }: Props) {
  return (
    <div className="container py-8">
      <TimelineView tripId={params.tripId} date={params.date} />
    </div>
  )
}
