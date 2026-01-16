import { createServiceClient } from "./supabaseServer"
import type {
  Park,
  Attraction,
  SourceMapping,
  WaitSample,
  ParkCalendarDay,
  ParkDayScore,
  AttractionHourStats,
  Group,
  GroupMember,
  Trip,
  TripDay,
  TripDayAssignment,
  DayPlan,
  DayPlanItem,
} from "./schema"

// Parks
export async function getParks(): Promise<Park[]> {
  try {
    const supabase = createServiceClient()

    // Query all parks first, then filter in memory
    // This works around an issue where .eq("is_active", true) returns 0 results
    // even though all parks have is_active = true (likely RLS or policy issue)
    const { data: allParks, error: allError } = await supabase
      .from("parks")
      .select("*")
      .limit(1000) // Explicit limit to ensure we get all parks

    if (allError) {
      throw allError
    }

    // Filter in memory instead of using database filter
    const filteredParks = (allParks?.filter(p => p.is_active === true) || [])
      .sort((a, b) => a.name.localeCompare(b.name)) // Sort by name after filtering

    return filteredParks
  } catch (error) {
    console.error("Error fetching parks:", error)
    throw error
  }
}

export async function getParkById(id: string): Promise<Park | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from("parks").select("*").eq("id", id).single()
  if (error) throw error
  return data
}

export async function getParkBySlug(slug: string): Promise<Park | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from("parks").select("*").eq("slug", slug).single()
  if (error) throw error
  return data
}

export async function upsertPark(park: Partial<Park> & { slug: string; name: string; timezone: string }): Promise<Park> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("parks")
    .upsert(park, { onConflict: "slug" })
    .select()
    .single()

  if (error) throw error
  return data
}

// Attractions
export async function getAttractionsByPark(parkId: string): Promise<Attraction[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("attractions")
    .select("*")
    .eq("park_id", parkId)
    .eq("is_archived", false)
    .order("name")

  if (error) throw error
  return data || []
}

export async function upsertAttraction(
  attraction: Partial<Attraction> & { park_id: string; name: string }
): Promise<Attraction> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("attractions")
    .upsert(attraction, { onConflict: "park_id,name" })
    .select()
    .single()

  if (error) throw error
  return data
}

// Source Mappings
export async function getSourceMapping(
  source: string,
  entityType: string,
  sourceId: string
): Promise<SourceMapping | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("source_mappings")
    .select("*")
    .eq("source", source)
    .eq("entity_type", entityType)
    .eq("source_id", sourceId)
    .single()

  if (error && error.code !== "PGRST116") throw error
  return data || null
}

export async function getSourceMappingByInternalId(
  source: string,
  entityType: string,
  internalId: string
): Promise<SourceMapping | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("source_mappings")
    .select("*")
    .eq("source", source)
    .eq("entity_type", entityType)
    .eq("internal_id", internalId)
    .single()

  if (error && error.code !== "PGRST116") throw error
  return data || null
}

export async function upsertSourceMapping(
  mapping: Partial<SourceMapping> & {
    source: string
    entity_type: string
    source_id: string
    internal_id: string
  }
): Promise<SourceMapping> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("source_mappings")
    .upsert(mapping, { onConflict: "source,entity_type,source_id" })
    .select()
    .single()

  if (error) throw error
  return data
}

// Wait Samples
export async function insertWaitSample(sample: Omit<WaitSample, "id">): Promise<WaitSample> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from("wait_samples").insert(sample).select().single()
  if (error) throw error
  return data
}

export async function getLatestWaitSamples(
  attractionId: string,
  limit: number = 100
): Promise<WaitSample[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("wait_samples")
    .select("*")
    .eq("attraction_id", attractionId)
    .order("sampled_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Park Calendar Days
export async function getParkCalendarDays(
  parkId: string,
  startDate: string,
  endDate: string
): Promise<ParkCalendarDay[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("park_calendar_days")
    .select("*")
    .eq("park_id", parkId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date")

  if (error) throw error
  return data || []
}

export async function upsertParkCalendarDay(
  day: Partial<ParkCalendarDay> & { park_id: string; date: string }
): Promise<ParkCalendarDay> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("park_calendar_days")
    .upsert(day, { onConflict: "park_id,date" })
    .select()
    .single()

  if (error) throw error
  return data
}

// Park Day Scores
export async function getParkDayScore(
  parkId: string,
  date: string,
  method: string
): Promise<ParkDayScore | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("park_day_scores")
    .select("*")
    .eq("park_id", parkId)
    .eq("date", date)
    .eq("method", method)
    .single()

  if (error && error.code !== "PGRST116") throw error
  return data || null
}

export async function upsertParkDayScore(
  score: Partial<ParkDayScore> & { park_id: string; date: string; crowd_score: number; method: string }
): Promise<ParkDayScore> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("park_day_scores")
    .upsert(score, { onConflict: "park_id,date,method" })
    .select()
    .single()

  if (error) throw error
  return data
}

// Attraction Hour Stats
export async function getAttractionHourStats(
  attractionId: string,
  month: number,
  dow: number,
  hour: number
): Promise<AttractionHourStats | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("attraction_hour_stats")
    .select("*")
    .eq("attraction_id", attractionId)
    .eq("month", month)
    .eq("dow", dow)
    .eq("hour", hour)
    .single()

  if (error && error.code !== "PGRST116") throw error
  return data || null
}

export async function upsertAttractionHourStats(
  stats: Partial<AttractionHourStats> & {
    attraction_id: string
    month: number
    dow: number
    hour: number
    sample_count: number
  }
): Promise<AttractionHourStats> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("attraction_hour_stats")
    .upsert(stats, { onConflict: "attraction_id,month,dow,hour" })
    .select()
    .single()

  if (error) throw error
  return data
}

// Trips
export async function getTripsByGroup(groupId: string): Promise<Trip[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getTripById(tripId: string): Promise<Trip | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).single()
  if (error && error.code !== "PGRST116") throw error
  return data || null
}

export async function createTrip(trip: Omit<Trip, "id" | "created_at">): Promise<Trip> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from("trips").insert(trip).select().single()
  if (error) throw error
  return data
}

// Trip Days
export async function getTripDays(tripId: string): Promise<TripDay[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("trip_days")
    .select("*")
    .eq("trip_id", tripId)
    .order("date")

  if (error) throw error
  return data || []
}

export async function upsertTripDay(day: Partial<TripDay> & { trip_id: string; date: string }): Promise<TripDay> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("trip_days")
    .upsert(day, { onConflict: "trip_id,date" })
    .select()
    .single()

  if (error) throw error
  return data
}

// Trip Day Assignments
export async function getTripDayAssignment(tripDayId: string): Promise<TripDayAssignment | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("trip_day_assignments")
    .select("*")
    .eq("trip_day_id", tripDayId)
    .single()

  if (error && error.code !== "PGRST116") throw error
  return data || null
}

export async function upsertTripDayAssignment(
  assignment: Partial<TripDayAssignment> & { trip_day_id: string }
): Promise<TripDayAssignment> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("trip_day_assignments")
    .upsert(assignment, { onConflict: "trip_day_id" })
    .select()
    .single()

  if (error) throw error
  return data
}

// Day Plans
export async function getDayPlan(tripDayId: string, version?: number): Promise<DayPlan | null> {
  const supabase = createServiceClient()
  let query = supabase.from("day_plans").select("*").eq("trip_day_id", tripDayId)

  if (version !== undefined) {
    query = query.eq("version", version)
  } else {
    query = query.order("version", { ascending: false }).limit(1)
  }

  const { data, error } = await query.single()
  if (error && error.code !== "PGRST116") throw error
  return data || null
}

export async function createDayPlan(plan: Omit<DayPlan, "id" | "created_at">): Promise<DayPlan> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from("day_plans").insert(plan).select().single()
  if (error) throw error
  return data
}

export async function updateDayPlanStatus(
  tripDayId: string,
  version: number,
  status: "draft" | "final"
): Promise<DayPlan> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("day_plans")
    .update({ status })
    .eq("trip_day_id", tripDayId)
    .eq("version", version)
    .select()
    .single()
  if (error) throw error
  return data
}

// Day Plan Items
export async function getDayPlanItems(dayPlanId: string): Promise<DayPlanItem[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("day_plan_items")
    .select("*")
    .eq("day_plan_id", dayPlanId)
    .order("order_index")

  if (error) throw error
  return data || []
}

export async function upsertDayPlanItems(items: Omit<DayPlanItem, "id">[]): Promise<DayPlanItem[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from("day_plan_items").upsert(items).select()
  if (error) throw error
  return data || []
}
