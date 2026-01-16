import { NextRequest, NextResponse } from "next/server"
import { getParks, upsertPark, upsertSourceMapping } from "@/lib/db/queries"
import { fetchQueueTimesParks, normalizeAndSavePark } from "@/lib/connectors/queueTimesRealtime"
import { createServiceClient } from "@/lib/db/supabaseServer"

const CRON_SECRET = process.env.CRON_SECRET

/**
 * POST /api/admin/sync-parks
 * 
 * Sincroniza parques do Queue-Times com o banco de dados local.
 * Cria source_mappings para parques que ainda não têm.
 */
export async function POST(request: NextRequest) {
  // Valida secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    const localParks = await getParks()
    const queueTimesParks = await fetchQueueTimesParks()

    const results = {
      totalQueueTimes: queueTimesParks.length,
      totalLocal: localParks.length,
      synced: 0,
      created: 0,
      errors: 0,
    }

    // Mapeamento manual conhecido (slug -> Queue-Times ID)
    const knownMappings: Record<string, number> = {
      "magic-kingdom": 1,
      "epcot": 2,
      "hollywood-studios": 3,
      "animal-kingdom": 4,
      "universal-studios-florida": 5,
      "islands-of-adventure": 6,
      "volcano-bay": 7,
      "seaworld-orlando": 8,
      "busch-gardens-tampa": 9,
      "epic-universe": 10, // Verificar ID correto
    }

    // Para cada parque local, tenta encontrar correspondente no Queue-Times
    for (const localPark of localParks) {
      try {
        // Verifica se já tem mapping
        const { data: existingMapping } = await supabase
          .from("source_mappings")
          .select("*")
          .eq("source", "queue_times")
          .eq("entity_type", "park")
          .eq("internal_id", localPark.id)
          .single()

        if (existingMapping) {
          console.log(`Park ${localPark.name} already has mapping`)
          results.synced++
          continue
        }

        // Tenta usar mapeamento conhecido primeiro
        const knownQueueTimesId = knownMappings[localPark.slug]
        if (knownQueueTimesId) {
          const qtPark = queueTimesParks.find((qt) => qt.id === knownQueueTimesId)
          if (qtPark) {
            await upsertSourceMapping({
              source: "queue_times",
              entity_type: "park",
              source_id: qtPark.id.toString(),
              internal_id: localPark.id,
              meta: {
                synced_at: new Date().toISOString(),
                queue_times_name: qtPark.name,
                method: "known_mapping",
              },
            })
            console.log(`Created mapping for ${localPark.name} -> Queue-Times ID ${qtPark.id} (known mapping)`)
            results.created++
            continue
          }
        }

        // Tenta encontrar por nome (match aproximado)
        const matchingQueueTimesPark = queueTimesParks.find((qt) => {
          const localName = localPark.name.toLowerCase().trim()
          const qtName = qt.name.toLowerCase().trim()
          const localSlug = localPark.slug.toLowerCase()
          const qtSlug = qt.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
          
          // Normaliza nomes removendo caracteres especiais
          const normalize = (str: string) => str.replace(/[^a-z0-9]/g, "")
          const normalizedLocal = normalize(localName)
          const normalizedQt = normalize(qtName)
          
          // Match exato
          if (localName === qtName || normalizedLocal === normalizedQt) {
            return true
          }
          
          // Match por slug
          if (localSlug === qtSlug || localSlug.includes(qtSlug) || qtSlug.includes(localSlug)) {
            return true
          }
          
          // Match parcial (um contém o outro)
          if (normalizedLocal.includes(normalizedQt) || normalizedQt.includes(normalizedLocal)) {
            return true
          }
          
          // Match por palavras-chave comuns
          const keywords = [
            ["magic", "kingdom"],
            ["hollywood", "studios"],
            ["animal", "kingdom"],
            ["epcot"],
            ["universal", "studios"],
            ["islands", "adventure"],
            ["epic", "universe"],
            ["volcano", "bay"],
            ["seaworld"],
            ["busch", "gardens"],
          ]
          
          for (const keywordSet of keywords) {
            const localHasAll = keywordSet.every(k => normalizedLocal.includes(k))
            const qtHasAll = keywordSet.every(k => normalizedQt.includes(k))
            if (localHasAll && qtHasAll) {
              return true
            }
          }
          
          return false
        })

        if (matchingQueueTimesPark) {
          // Cria mapping
          await upsertSourceMapping({
            source: "queue_times",
            entity_type: "park",
            source_id: matchingQueueTimesPark.id.toString(),
            internal_id: localPark.id,
            meta: {
              synced_at: new Date().toISOString(),
              queue_times_name: matchingQueueTimesPark.name,
            },
          })
          console.log(`Created mapping for ${localPark.name} -> Queue-Times ID ${matchingQueueTimesPark.id}`)
          results.created++
        } else {
          console.warn(`No Queue-Times match found for ${localPark.name}`)
          results.errors++
        }
      } catch (error: any) {
        console.error(`Error syncing park ${localPark.id}:`, error)
        results.errors++
      }
    }

    return NextResponse.json({
      message: "Parks sync completed",
      results,
    })
  } catch (error: any) {
    console.error("Error in parks sync:", error)
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
