import { kv } from "@vercel/kv"

const CACHE_TTL = {
  LIVE: 120, // 2 minutos
  CALENDAR: 21600, // 6 horas
  STATS: 86400, // 24 horas
} as const

export type CacheKey = `live:park:${string}` | `calendar:park:${string}:${string}` | `stats:park:${string}`

/**
 * Obtém valor do cache
 */
export async function getCache<T>(key: CacheKey): Promise<T | null> {
  try {
    const value = await kv.get<T>(key)
    return value
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error)
    return null
  }
}

/**
 * Define valor no cache com TTL
 */
export async function setCache(
  key: CacheKey,
  value: unknown,
  ttl: number
): Promise<void> {
  try {
    await kv.set(key, value, { ex: ttl })
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error)
  }
}

/**
 * Obtém ou calcula valor com cache
 */
export async function getOrSetCache<T>(
  key: CacheKey,
  fn: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = await getCache<T>(key)
  if (cached !== null) {
    return cached
  }

  const value = await fn()
  await setCache(key, value, ttl)
  return value
}

/**
 * Cache para live data (120s)
 */
export async function getLiveCache<T>(parkId: string, fn: () => Promise<T>): Promise<T> {
  return getOrSetCache(`live:park:${parkId}` as CacheKey, fn, CACHE_TTL.LIVE)
}

/**
 * Cache para calendar data (6h)
 */
export async function getCalendarCache<T>(
  parkId: string,
  date: string,
  fn: () => Promise<T>
): Promise<T> {
  return getOrSetCache(
    `calendar:park:${parkId}:${date}` as CacheKey,
    fn,
    CACHE_TTL.CALENDAR
  )
}

/**
 * Cache para stats (24h)
 */
export async function getStatsCache<T>(parkId: string, fn: () => Promise<T>): Promise<T> {
  return getOrSetCache(`stats:park:${parkId}` as CacheKey, fn, CACHE_TTL.STATS)
}

/**
 * Limpa cache de uma chave
 */
export async function clearCache(key: CacheKey): Promise<void> {
  try {
    await kv.del(key)
  } catch (error) {
    console.error(`Cache clear error for key ${key}:`, error)
  }
}
