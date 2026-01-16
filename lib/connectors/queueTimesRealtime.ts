import { createServiceClient } from "@/lib/db/supabaseServer"
import {
  upsertPark,
  upsertAttraction,
  insertWaitSample,
  upsertSourceMapping,
} from "@/lib/db/queries"
import type { Park, Attraction, SourceMapping } from "@/lib/db/schema"

const QUEUE_TIMES_BASE_URL = "https://queue-times.com"

interface QueueTimesPark {
  id: number
  name: string
  country: string
  timezone: string
  latitude: number
  longitude: number
}

interface QueueTimesLand {
  id: number
  name: string
}

interface QueueTimesRide {
  id: number
  name: string
  is_open: boolean
  wait_time: number
  last_updated: string
}

interface QueueTimesGroup {
  id: number
  name: string
  parks: QueueTimesPark[]
}

interface QueueTimesParkData {
  lands: Array<{
    id: number
    name: string
    rides: QueueTimesRide[]
  }>
}

/**
 * Busca lista de parques do Queue-Times
 */
export async function fetchQueueTimesParks(): Promise<QueueTimesPark[]> {
  const response = await fetch(`${QUEUE_TIMES_BASE_URL}/parks.json`)
  if (!response.ok) {
    throw new Error(`Failed to fetch parks: ${response.statusText}`)
  }
  const data = (await response.json()) as QueueTimesGroup[]
  return data.flatMap((group) => group.parks)
}

/**
 * Busca dados de filas de um parque específico
 */
export async function fetchQueueTimesParkData(parkId: number): Promise<QueueTimesParkData> {
  const response = await fetch(`${QUEUE_TIMES_BASE_URL}/parks/${parkId}/queue_times.json`)
  if (!response.ok) {
    throw new Error(`Failed to fetch park data for ${parkId}: ${response.statusText}`)
  }
  return (await response.json()) as QueueTimesParkData
}

/**
 * Normaliza e salva um parque do Queue-Times
 */
export async function normalizeAndSavePark(
  queueTimesPark: QueueTimesPark
): Promise<{ park: Park; mappingId: string }> {
  const slug = queueTimesPark.name.toLowerCase().replace(/\s+/g, "-")

  // Cria ou atualiza o parque
  const park = await upsertPark({
    slug,
    name: queueTimesPark.name,
    country: queueTimesPark.country,
    timezone: queueTimesPark.timezone,
    lat: queueTimesPark.latitude,
    lng: queueTimesPark.longitude,
    is_active: true,
  })

  // Cria mapping
  const mapping = await upsertSourceMapping({
    source: "queue_times",
    entity_type: "park",
    source_id: queueTimesPark.id.toString(),
    internal_id: park.id,
    meta: {
      original_id: queueTimesPark.id,
      original_name: queueTimesPark.name,
    },
  })

  return { park, mappingId: mapping.id }
}

/**
 * Normaliza e salva uma atração do Queue-Times
 */
export async function normalizeAndSaveAttraction(
  parkId: string,
  landName: string | null,
  ride: QueueTimesRide
): Promise<{ attraction: Attraction; mappingId: string }> {
  // Cria ou atualiza a atração
  const attraction = await upsertAttraction({
    park_id: parkId,
    name: ride.name,
    land_name: landName,
    attraction_type: "ride",
    is_archived: false,
  })

  // Cria mapping
  const mapping = await upsertSourceMapping({
    source: "queue_times",
    entity_type: "attraction",
    source_id: ride.id.toString(),
    internal_id: attraction.id,
    meta: {
      original_id: ride.id,
      original_name: ride.name,
    },
  })

  return { attraction, mappingId: mapping.id }
}

/**
 * Processa e salva amostras de fila
 */
export async function processAndSaveWaitSamples(
  attractionId: string,
  ride: QueueTimesRide
): Promise<void> {
  // wait_time=0 precisa cruzar com is_open (0 pode ser walk-on ou closed)
  const waitMinutes = ride.is_open ? ride.wait_time : 0

  await insertWaitSample({
    attraction_id: attractionId,
    sampled_at: new Date(ride.last_updated).toISOString(),
    is_open: ride.is_open,
    wait_minutes: waitMinutes,
    raw: {
      original_data: ride,
      source: "queue_times",
    },
  })
}

/**
 * Processa um parque completo: busca dados, normaliza e salva
 * @param parkId Queue-Times park ID
 * @param internalParkIdOverride Se fornecido, usa este ID interno em vez de buscar no source_mappings
 */
export async function processQueueTimesPark(parkId: number, internalParkIdOverride?: string): Promise<void> {
  // Busca dados do parque
  const parkData = await fetchQueueTimesParkData(parkId)
  const supabase = createServiceClient()

  let internalParkId: string

  if (internalParkIdOverride) {
    // Usa o ID interno fornecido (bypass do source_mappings)
    internalParkId = internalParkIdOverride
  } else {
    // Busca parque na base para obter o ID interno
    const { data: mapping } = await supabase
      .from("source_mappings")
      .select("internal_id")
      .eq("source", "queue_times")
      .eq("entity_type", "park")
      .eq("source_id", parkId.toString())
      .single()

    if (!mapping) {
      throw new Error(`Park mapping not found for Queue-Times ID: ${parkId}`)
    }

    internalParkId = mapping.internal_id
  }

  // Processa cada land e suas rides
  for (const land of parkData.lands) {
    for (const ride of land.rides) {
      // Busca ou cria atração
      const { data: attractionMapping } = await supabase
        .from("source_mappings")
        .select("internal_id")
        .eq("source", "queue_times")
        .eq("entity_type", "attraction")
        .eq("source_id", ride.id.toString())
        .single()

      let attractionId: string

      if (attractionMapping) {
        attractionId = attractionMapping.internal_id

        // Verifica se a atração pertence ao parque correto, senão atualiza
        const { data: existingAttraction } = await supabase
          .from("attractions")
          .select("park_id")
          .eq("id", attractionId)
          .single()

        if (existingAttraction && existingAttraction.park_id !== internalParkId) {
          console.log(`Fixing orphaned attraction ${attractionId}: ${existingAttraction.park_id} -> ${internalParkId}`)
          await supabase
            .from("attractions")
            .update({ park_id: internalParkId })
            .eq("id", attractionId)
        }
      } else {
        // Cria nova atração
        const { attraction } = await normalizeAndSaveAttraction(internalParkId, land.name, ride)
        attractionId = attraction.id
      }

      // Salva amostra de fila
      await processAndSaveWaitSamples(attractionId, ride)
    }
  }
}

/**
 * Processa todos os parques de Orlando (ou parques selecionados)
 */
export async function processAllQueueTimesParks(
  parkIds?: number[]
): Promise<{ processed: number; errors: number }> {
  let parksToProcess: QueueTimesPark[]

  if (parkIds) {
    const allParks = await fetchQueueTimesParks()
    parksToProcess = allParks.filter((p) => parkIds.includes(p.id))
  } else {
    // Por padrão, processa parques de Orlando
    const allParks = await fetchQueueTimesParks()
    parksToProcess = allParks.filter((p) => p.country === "US" && p.name.includes("Orlando"))
  }

  let processed = 0
  let errors = 0

  for (const park of parksToProcess) {
    try {
      // Garante que o parque existe na base
      const { park: internalPark } = await normalizeAndSavePark(park)

      // Processa dados do parque
      await processQueueTimesPark(park.id)
      processed++
    } catch (error) {
      console.error(`Error processing park ${park.name} (${park.id}):`, error)
      errors++
    }
  }

  return { processed, errors }
}

/**
 * Tenta encontrar e mapear um parque existente na base com o Queue-Times
 * Self-healing para parques sem mapping
 */
export async function findAndMapPark(internalParkId: string): Promise<{ mapping: SourceMapping } | null> {
  const supabase = createServiceClient()

  // 1. Busca nome do parque no banco
  const { data: park } = await supabase.from("parks").select("name, slug").eq("id", internalParkId).single()
  if (!park) return null

  // 2. Busca lista do Queue-Times
  const qtParks = await fetchQueueTimesParks()

  // 3. Tenta encontrar match usando correspondência por palavras
  // Extrai palavras significativas (remove "at", "the", "of", etc)
  const stopWords = new Set(["at", "the", "of", "and", "in", "to", "park", "parks", "theme"])
  const extractWords = (s: string) =>
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))

  const targetWords = new Set(extractWords(park.name))

  // Calcula score de similaridade (palavras em comum / total de palavras)
  let bestMatch: typeof qtParks[0] | null = null
  let bestScore = 0

  for (const p of qtParks) {
    const qtWords = extractWords(p.name)
    const commonWords = qtWords.filter(w => targetWords.has(w))

    // Score = palavras em comum / mínimo de palavras (para não penalizar nomes longos)
    const score = commonWords.length / Math.min(targetWords.size, qtWords.length)

    if (score > bestScore && score >= 0.5) { // Mínimo 50% de match
      bestScore = score
      bestMatch = p
    }
  }

  const match = bestMatch

  if (match) {
    console.log(`Self-healing: Found match for ${park.name} -> ${match.name} (${match.id})`)

    // 4. "Zombie Killer": Verifica se já existe um mapping para este ID do Queue-Times apontando para OUTRO lugar
    const { data: existingMapping } = await supabase
      .from("source_mappings")
      .select("*")
      .eq("source", "queue_times")
      .eq("entity_type", "park")
      .eq("source_id", match.id.toString())
      .single()

    if (existingMapping) {
      console.warn(`Self-healing: Found ZOMBIE mapping for QT ID ${match.id} -> ${existingMapping.internal_id}. DELETING...`)
      await supabase
        .from("source_mappings")
        .delete()
        .eq("id", existingMapping.id)
    }

    // 5. Salva mapping explicitamente para o ID interno solicitado
    const mapping = await upsertSourceMapping({
      source: "queue_times",
      entity_type: "park",
      source_id: match.id.toString(),
      internal_id: internalParkId,
      meta: {
        original_id: match.id,
        original_name: match.name,
      },
    })

    console.log(`Self-healing: Upserted mapping:`, JSON.stringify(mapping, null, 2))

    // Retorna o mapeamento completo para evitar race conditions na re-leitura
    return { mapping }
  }

  console.warn(`Self-healing: No match found for park ${park.name}`)
  return null
}
