import { NextRequest, NextResponse } from "next/server"
import { withLock } from "@/lib/utils/cronLock"
import { processAllQueueTimesParks } from "@/lib/connectors/queueTimesRealtime"

const LOCK_KEY = "queuetimes_live"
const CRON_SECRET = process.env.CRON_SECRET

/**
 * Cron job para atualizar dados ao vivo do Queue-Times (roda a cada 5 min)
 */
export async function GET(request: NextRequest) {
  // Valida secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await withLock(LOCK_KEY, async () => {
    return await processAllQueueTimesParks()
  })

  if (result === null) {
    return NextResponse.json({ message: "Lock not acquired, skipping" }, { status: 200 })
  }

  return NextResponse.json({
    message: "Queue-Times live data updated",
    processed: result.processed,
    errors: result.errors,
  })
}
