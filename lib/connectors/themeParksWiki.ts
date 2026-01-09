const THEMEPARKS_BASE_URL = process.env.THEMEPARKS_BASE_URL || "https://api.themeparks.wiki/v1"

interface ThemeParksDestination {
  id: string
  name: string
  slug: string
}

interface ThemeParksEntity {
  id: string
  name: string
  entityType: string
  timezone: string
  location: {
    latitude: number
    longitude: number
  }
}

interface ThemeParksSchedule {
  date: string // YYYY-MM-DD
  openingTime: string | null
  closingTime: string | null
  type: string
}

interface ThemeParksLiveData {
  id: string
  name: string
  waitTime: number | null
  status: string
  lastUpdate: string
}

/**
 * Busca destinos disponíveis
 */
export async function fetchThemeParksDestinations(): Promise<ThemeParksDestination[]> {
  const response = await fetch(`${THEMEPARKS_BASE_URL}/destinations`)
  if (!response.ok) {
    throw new Error(`Failed to fetch destinations: ${response.statusText}`)
  }
  const data = await response.json()
  return data.destinations || []
}

/**
 * Busca entidade por ID
 */
export async function fetchThemeParksEntity(entityId: string): Promise<ThemeParksEntity> {
  const response = await fetch(`${THEMEPARKS_BASE_URL}/entity/${entityId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch entity ${entityId}: ${response.statusText}`)
  }
  return (await response.json()) as ThemeParksEntity
}

/**
 * Busca children (atrações) de uma entidade
 */
export async function fetchThemeParksChildren(entityId: string): Promise<ThemeParksEntity[]> {
  const response = await fetch(`${THEMEPARKS_BASE_URL}/entity/${entityId}/children`)
  if (!response.ok) {
    throw new Error(`Failed to fetch children for ${entityId}: ${response.statusText}`)
  }
  const data = await response.json()
  return data.children || []
}

/**
 * Busca schedule de uma entidade
 */
export async function fetchThemeParksSchedule(
  entityId: string,
  startDate?: string,
  endDate?: string
): Promise<ThemeParksSchedule[]> {
  let url = `${THEMEPARKS_BASE_URL}/entity/${entityId}/schedule`
  if (startDate && endDate) {
    url += `?startDate=${startDate}&endDate=${endDate}`
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch schedule for ${entityId}: ${response.statusText}`)
  }
  const data = await response.json()
  return data.schedule || []
}

/**
 * Busca schedule por mês
 */
export async function fetchThemeParksScheduleByMonth(
  entityId: string,
  year: number,
  month: number
): Promise<ThemeParksSchedule[]> {
  const response = await fetch(
    `${THEMEPARKS_BASE_URL}/entity/${entityId}/schedule/${year}/${month}`
  )
  if (!response.ok) {
    throw new Error(
      `Failed to fetch schedule for ${entityId} ${year}/${month}: ${response.statusText}`
    )
  }
  const data = await response.json()
  return data.schedule || []
}

/**
 * Busca live data de uma entidade
 */
export async function fetchThemeParksLiveData(entityId: string): Promise<ThemeParksLiveData[]> {
  const response = await fetch(`${THEMEPARKS_BASE_URL}/entity/${entityId}/live`)
  if (!response.ok) {
    throw new Error(`Failed to fetch live data for ${entityId}: ${response.statusText}`)
  }
  const data = await response.json()
  return data.liveData || []
}

/**
 * Normaliza schedule do ThemeParks para formato interno
 */
export function normalizeThemeParksSchedule(
  schedule: ThemeParksSchedule[]
): Array<{
  date: string
  openTime: string | null
  closeTime: string | null
}> {
  return schedule.map((s) => ({
    date: s.date,
    openTime: s.openingTime ? s.openingTime.substring(0, 5) : null, // HH:mm
    closeTime: s.closingTime ? s.closingTime.substring(0, 5) : null, // HH:mm
  }))
}
