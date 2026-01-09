import { z } from "zod"
import type {
  TripOptimizeRequest,
  DayPlanRequest,
  ParkCalendarDayDTO,
  AttractionDTO,
  AttractionLiveDTO,
} from "./types"

// Park DTOs
export const parkDTOSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  timezone: z.string(),
})

export const parkCalendarDayDTOSchema = z.object({
  parkId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  crowdPercent: z.number().min(0).max(100).optional(),
  openTimeLocal: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closeTimeLocal: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  earlyEntry: z
    .object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .nullable()
    .optional(),
  flags: z.object({
    publicHoliday: z.boolean().optional(),
    rainyDay: z.boolean().optional(),
    ticketedEvent: z.boolean().optional(),
    extendedEvening: z.boolean().optional(),
  }),
  source: z.enum(["queue_times_calendar", "themeparks_wiki", "unknown"]),
})

export const attractionDTOSchema = z.object({
  id: z.string().uuid(),
  parkId: z.string().uuid(),
  name: z.string(),
  landName: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  isArchived: z.boolean(),
})

export const attractionLiveDTOSchema = z.object({
  attractionId: z.string().uuid(),
  isOpen: z.boolean(),
  waitMinutes: z.number().int().min(0),
  lastUpdatedUtc: z.string().datetime(),
})

// Trip Optimization
export const tripOptimizeRequestSchema = z.object({
  tripId: z.string().uuid(),
  parksToSchedule: z.array(z.string().uuid()).min(1),
  constraints: z.object({
    restDays: z.number().int().min(0).optional(),
    avoidWeekendsFor: z.array(z.string().uuid()).optional(),
    maxHeavyStreak: z.number().int().min(1).optional(),
    lockedAssignments: z
      .array(
        z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          parkId: z.string().uuid(),
        })
      )
      .optional(),
  }),
  weights: z.object({
    crowd: z.number().min(0),
    hours: z.number().min(0),
    weekendPenalty: z.number().min(0),
    travelDayPenalty: z.number().min(0),
  }),
})

export const tripOptimizeResponseSchema = z.object({
  tripId: z.string().uuid(),
  assignments: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      parkId: z.string().uuid().nullable(),
      score: z.number(),
      breakdown: z.record(z.string(), z.number()),
      source: z.literal("optimizer"),
    })
  ),
  alternatives: z.array(
    z.object({
      name: z.string(),
      assignments: z.array(
        z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          parkId: z.string().uuid().nullable(),
          score: z.number(),
        })
      ),
    })
  ),
})

// Day Plan
export const dayPlanRequestSchema = z.object({
  tripId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  parkId: z.string().uuid(),
  arrivalTimeLocal: z.string().regex(/^\d{2}:\d{2}$/),
  lunchWindow: z
    .object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .optional(),
  walkMinutesDefault: z.number().int().min(0),
  mode: z.enum(["p50", "p80"]),
  mustDoAttractionIds: z.array(z.string().uuid()).min(1),
  wantAttractionIds: z.array(z.string().uuid()).optional(),
  fixedItems: z
    .array(
      z.object({
        type: z.enum(["show", "meal"]),
        title: z.string(),
        startTimeLocal: z.string().regex(/^\d{2}:\d{2}$/),
        endTimeLocal: z.string().regex(/^\d{2}:\d{2}$/),
      })
    )
    .optional(),
  liveBias: z
    .object({
      enabled: z.boolean(),
      maxWaitAcceptable: z.number().int().min(0).optional(),
    })
    .optional(),
})

export const dayPlanResponseSchema = z.object({
  tripId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  parkId: z.string().uuid(),
  parkHours: z
    .object({
      open: z.string().regex(/^\d{2}:\d{2}$/),
      close: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .optional(),
  version: z.number().int().min(1),
  items: z.array(
    z.object({
      orderIndex: z.number().int().min(0),
      type: z.enum(["ride", "show", "meal", "buffer", "travel"]),
      title: z.string(),
      attractionId: z.string().uuid().optional(),
      startTimeLocal: z.string().regex(/^\d{2}:\d{2}$/),
      endTimeLocal: z.string().regex(/^\d{2}:\d{2}$/),
      expectedWait: z.number().int().min(0).optional(),
      expectedWalk: z.number().int().min(0).optional(),
      riskScore: z.number().min(0).max(1).optional(),
      explanation: z.array(z.string()).optional(),
    })
  ),
  metrics: z.object({
    totalPlannedRides: z.number().int().min(0),
    totalExpectedWait: z.number().int().min(0),
    totalWalk: z.number().int().min(0),
    slackMinutes: z.number().int(),
  }),
})

// Type guards
export function isValidTripOptimizeRequest(data: unknown): data is TripOptimizeRequest {
  return tripOptimizeRequestSchema.safeParse(data).success
}

export function isValidDayPlanRequest(data: unknown): data is DayPlanRequest {
  return dayPlanRequestSchema.safeParse(data).success
}
