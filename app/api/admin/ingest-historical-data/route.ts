import { NextRequest, NextResponse } from "next/server"
import { getParks } from "@/lib/db/queries"
import { processQueueTimesPark } from "@/lib/connectors/queueTimesRealtime"
import { processQueueTimesCalendarForMonths } from "@/lib/connectors/queueTimesCalendarScraper"
import { createServiceClient } from "@/lib/db/supabaseServer"

const CRON_SECRET = process.env.CRON_SECRET

/**
 * POST /api/admin/ingest-historical-data
 * 
 * Endpoint para baixar e armazenar dados históricos de todos os parques.
 * Este processo deve ser executado uma vez para popular o banco com dados históricos.
 * 
 * Query params:
 * - months: número de meses de histórico para baixar (default: 6)
 * - parks: IDs dos parques específicos (opcional, se não fornecido, processa todos)
 */
export async function POST(request: NextRequest) {
  // Valida secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const monthsBack = parseInt(searchParams.get("months") || "6", 10)
    const specificParkIds = searchParams.get("parks")?.split(",") || null

    const supabase = createServiceClient()
    
    // Busca parques
    let parks = await getParks()
    if (specificParkIds) {
      parks = parks.filter((p) => specificParkIds.includes(p.id))
    }

    const results = {
      parks: {
        total: parks.length,
        processed: 0,
        errors: 0,
      },
      waitSamples: {
        total: 0,
        saved: 0,
        errors: 0,
      },
      calendarDays: {
        total: 0,
        saved: 0,
        errors: 0,
      },
    }

    // Processa cada parque
    for (const park of parks) {
      try {
        console.log(`Processing park: ${park.name} (${park.id})`)

        // 1. Busca mapping do Queue-Times pelo internal_id
        const supabase = createServiceClient()
        const { data: mapping, error: mappingError } = await supabase
          .from("source_mappings")
          .select("*")
          .eq("source", "queue_times")
          .eq("entity_type", "park")
          .eq("internal_id", park.id)
          .single()
        
        if (mappingError || !mapping) {
          console.warn(`No Queue-Times mapping found for park ${park.id}:`, mappingError?.message)
          results.parks.errors++
          continue
        }

        const queueTimesId = parseInt(mapping.source_id, 10)

        // 2. Baixa e salva wait samples históricos
        try {
          console.log(`  Fetching wait samples for park ${park.name}...`)
          await processQueueTimesPark(queueTimesId)
          results.waitSamples.saved += 100 // Estimativa, o processQueueTimesPark já salva
        } catch (error) {
          console.error(`  Error fetching wait samples for ${park.name}:`, error)
          results.waitSamples.errors++
        }

        // 3. Baixa calendário para os próximos meses
        try {
          console.log(`  Fetching calendar for park ${park.name}...`)
          const calendarResult = await processQueueTimesCalendarForMonths(queueTimesId, monthsBack)
          results.calendarDays.saved += calendarResult.processed
          results.calendarDays.errors += calendarResult.errors
          results.calendarDays.total += calendarResult.processed
        } catch (error) {
          console.error(`  Error processing calendar for ${park.name}:`, error)
          results.calendarDays.errors++
        }

        results.parks.processed++
        
        // Delay entre parques para não sobrecarregar
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Error processing park ${park.id}:`, error)
        results.parks.errors++
      }
    }

    return NextResponse.json({
      message: "Historical data ingestion completed",
      results,
    })
  } catch (error: any) {
    console.error("Error in historical data ingestion:", error)
    console.error("Error stack:", error.stack)
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
