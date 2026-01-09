import {
  upsertPark,
  upsertAttraction,
  upsertSourceMapping,
  getSourceMapping,
} from "@/lib/db/queries"
import type { Park, Attraction } from "@/lib/db/schema"

/**
 * Normaliza e mapeia um parque de qualquer fonte para o formato interno
 */
export async function normalizePark(
  source: "queue_times" | "themeparks_wiki",
  sourceId: string,
  data: {
    name: string
    country?: string
    timezone: string
    lat?: number
    lng?: number
    meta?: Record<string, unknown>
  }
): Promise<{ park: Park; mappingId: string }> {
  // Verifica se já existe mapping
  const existingMapping = await getSourceMapping(source, "park", sourceId)

  if (existingMapping) {
    // Atualiza parque existente
    const park = await upsertPark({
      id: existingMapping.internal_id,
      slug: data.name.toLowerCase().replace(/\s+/g, "-"),
      name: data.name,
      country: data.country,
      timezone: data.timezone,
      lat: data.lat,
      lng: data.lng,
      is_active: true,
    })

    return { park, mappingId: existingMapping.id }
  }

  // Cria novo parque
  const slug = data.name.toLowerCase().replace(/\s+/g, "-")
  const park = await upsertPark({
    slug,
    name: data.name,
    country: data.country,
    timezone: data.timezone,
    lat: data.lat,
    lng: data.lng,
    is_active: true,
  })

  // Cria mapping
  const mapping = await upsertSourceMapping({
    source,
    entity_type: "park",
    source_id: sourceId,
    internal_id: park.id,
    meta: data.meta || {},
  })

  return { park, mappingId: mapping.id }
}

/**
 * Normaliza e mapeia uma atração de qualquer fonte para o formato interno
 */
export async function normalizeAttraction(
  source: "queue_times" | "themeparks_wiki",
  sourceId: string,
  parkId: string,
  data: {
    name: string
    landName?: string | null
    type?: string | null
    meta?: Record<string, unknown>
  }
): Promise<{ attraction: Attraction; mappingId: string }> {
  // Verifica se já existe mapping
  const existingMapping = await getSourceMapping(source, "attraction", sourceId)

  if (existingMapping) {
    // Atualiza atração existente
    const attraction = await upsertAttraction({
      id: existingMapping.internal_id,
      park_id: parkId,
      name: data.name,
      land_name: data.landName,
      attraction_type: data.type,
      is_archived: false,
    })

    return { attraction, mappingId: existingMapping.id }
  }

  // Cria nova atração
  const attraction = await upsertAttraction({
    park_id: parkId,
    name: data.name,
    land_name: data.landName,
    attraction_type: data.type,
    is_archived: false,
  })

  // Cria mapping
  const mapping = await upsertSourceMapping({
    source,
    entity_type: "attraction",
    source_id: sourceId,
    internal_id: attraction.id,
    meta: data.meta || {},
  })

  return { attraction, mappingId: mapping.id }
}

/**
 * Obtém ID interno a partir de source mapping
 */
export async function getInternalId(
  source: "queue_times" | "themeparks_wiki",
  entityType: "park" | "attraction",
  sourceId: string
): Promise<string | null> {
  const mapping = await getSourceMapping(source, entityType, sourceId)
  return mapping?.internal_id || null
}
