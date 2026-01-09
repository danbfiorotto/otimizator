import { kv } from "@vercel/kv"

const RATE_LIMIT_WINDOW = 60 // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 60 // 60 requests por minuto

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

/**
 * Rate limiting simples usando Vercel KV
 */
export async function rateLimit(
  identifier: string,
  maxRequests: number = RATE_LIMIT_MAX_REQUESTS,
  windowSeconds: number = RATE_LIMIT_WINDOW
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`
  const now = Date.now()
  const windowStart = now - windowSeconds * 1000

  try {
    // Obtém requisições no window atual
    const requests = await kv.zrange<string[]>(key, windowStart, now, {
      byScore: true,
      rev: true,
    })

    // Remove requisições antigas
    if (requests.length > 0) {
      await kv.zremrangebyscore(key, 0, windowStart)
    }

    // Conta requisições atuais
    const currentCount = requests.length

    if (currentCount >= maxRequests) {
      // Rate limit excedido
      const oldestRequest = requests[requests.length - 1]
      const resetTime = parseInt(oldestRequest) + windowSeconds * 1000

      return {
        success: false,
        remaining: 0,
        reset: resetTime,
      }
    }

    // Adiciona nova requisição
    await kv.zadd(key, { score: now, member: now.toString() })
    await kv.expire(key, windowSeconds)

    return {
      success: true,
      remaining: maxRequests - currentCount - 1,
      reset: now + windowSeconds * 1000,
    }
  } catch (error) {
    console.error("Rate limit error:", error)
    // Em caso de erro, permite a requisição (fail open)
    return {
      success: true,
      remaining: maxRequests,
      reset: now + windowSeconds * 1000,
    }
  }
}

/**
 * Rate limit por IP
 */
export async function rateLimitByIP(ip: string): Promise<RateLimitResult> {
  return rateLimit(`ip:${ip}`)
}

/**
 * Rate limit por grupo
 */
export async function rateLimitByGroup(groupId: string): Promise<RateLimitResult> {
  return rateLimit(`group:${groupId}`, 100, 60) // 100 requests por minuto para grupos
}
