/**
 * Types TypeScript gerados do schema Supabase
 * Estes tipos devem ser mantidos em sync com o schema SQL
 */

export type Park = {
  id: string
  slug: string
  name: string
  country: string | null
  timezone: string
  lat: number | null
  lng: number | null
  is_active: boolean
  created_at: string
}

export type Attraction = {
  id: string
  park_id: string
  name: string
  land_name: string | null
  attraction_type: string | null
  is_archived: boolean
  created_at: string
}

export type SourceMapping = {
  id: string
  source: "queue_times" | "themeparks_wiki"
  entity_type: "park" | "attraction"
  source_id: string
  internal_id: string
  meta: Record<string, unknown>
  created_at: string
}

export type WaitSample = {
  id: number
  attraction_id: string
  sampled_at: string
  is_open: boolean
  wait_minutes: number
  raw: Record<string, unknown>
}

export type ParkCalendarDay = {
  id: number
  park_id: string
  date: string
  crowd_percent: number | null
  open_time_local: string | null
  close_time_local: string | null
  early_entry_start: string | null
  early_entry_end: string | null
  has_ticketed_event: boolean | null
  has_extended_evening: boolean | null
  is_public_holiday: boolean | null
  is_rainy_day: boolean | null
  raw: Record<string, unknown>
}

export type ParkDayScore = {
  id: number
  park_id: string
  date: string
  crowd_score: number
  method: "calendar" | "computed" | "hybrid"
  computed_at: string
}

export type AttractionHourStats = {
  id: number
  attraction_id: string
  month: number
  dow: number
  hour: number
  p50: number | null
  p80: number | null
  p95: number | null
  open_rate: number | null
  sample_count: number
  updated_at: string
}

export type Group = {
  id: string
  name: string
  owner_user_id: string
  created_at: string
}

export type GroupMember = {
  id: string
  group_id: string
  user_id: string
  role: "owner" | "admin" | "member"
  created_at: string
}

export type Trip = {
  id: string
  group_id: string
  name: string
  start_date: string
  end_date: string
  destination: string
  preferences: Record<string, unknown>
  created_at: string
}

export type TripDay = {
  id: string
  trip_id: string
  date: string
  notes: string | null
}

export type TripDayAssignment = {
  id: string
  trip_day_id: string
  park_id: string | null
  is_locked: boolean
  source: "user" | "optimizer"
  score_breakdown: Record<string, unknown>
  updated_at: string
}

export type DayPlan = {
  id: string
  trip_day_id: string
  version: number
  status: "draft" | "final"
  inputs: Record<string, unknown>
  created_at: string
}

export type DayPlanItem = {
  id: string
  day_plan_id: string
  order_index: number
  attraction_id: string | null
  title: string
  item_type: "ride" | "show" | "meal" | "buffer" | "travel"
  start_time_local: string | null
  end_time_local: string | null
  expected_wait: number | null
  expected_walk: number | null
  risk_score: number | null
  meta: Record<string, unknown>
}

export type AuditEvent = {
  id: number
  trip_id: string
  user_id: string | null
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}
