import { kv } from "@vercel/kv"

const LOCK_TTL = 300 // 5 minutos (TTL máximo para locks)

/**
 * Obtém lock distribuído para cron job
 */
export async function acquireLock(lockKey: string, ttl: number = LOCK_TTL): Promise<boolean> {
  const key = `lock:${lockKey}`
  const now = Date.now()
  const lockValue = `${now}`

  try {
    // Tenta criar a chave apenas se não existir (SET NX)
    const result = await kv.set(key, lockValue, {
      ex: ttl,
      nx: true, // Only set if not exists
    })

    return result === "OK"
  } catch (error) {
    console.error(`Lock acquire error for key ${lockKey}:`, error)
    return false
  }
}

/**
 * Libera lock
 */
export async function releaseLock(lockKey: string): Promise<void> {
  const key = `lock:${lockKey}`
  try {
    await kv.del(key)
  } catch (error) {
    console.error(`Lock release error for key ${lockKey}:`, error)
  }
}

/**
 * Executa função com lock distribuído
 */
export async function withLock<T>(
  lockKey: string,
  fn: () => Promise<T>,
  ttl: number = LOCK_TTL
): Promise<T | null> {
  const acquired = await acquireLock(lockKey, ttl)
  if (!acquired) {
    console.log(`Lock not acquired for ${lockKey}, skipping execution`)
    return null
  }

  try {
    return await fn()
  } finally {
    await releaseLock(lockKey)
  }
}
