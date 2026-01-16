# Migração para ThemeParks.wiki API

## Objetivo
Migrar a fonte de dados principal do projeto de **Queue-Times** para **ThemeParks.wiki**, aproveitando dados mais ricos (Single Rider, Lightning Lane, Boarding Groups, Schedules).

---

## 📖 Documentação da API

### Base URL
```
https://api.themeparks.wiki/v1
```

### Endpoints Disponíveis

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/destinations` | GET | Lista todos os destinos (resorts) |
| `/entity/{id}/children` | GET | Parques e atrações recursivamente |
| `/entity/{id}/live` | GET | Wait times em tempo real |
| `/entity/{id}/schedule` | GET | Calendário (30 dias) |
| `/entity/{id}/schedule/{year}/{month}` | GET | Calendário por mês |

---

## 🆔 IDs Importantes (Orlando)

```typescript
const THEMEPARKS_IDS = {
  // Destinations (Resorts)
  WDW_RESORT: "e957da41-3552-4cf6-b636-5babc5cbc4e5",
  UNIVERSAL_ORLANDO: "89db5d43-c434-4097-b71f-f6869f495a22",
  SEAWORLD_ORLANDO: "643e837e-b244-4663-8d3a-148c26ecba9c",
  
  // Parks (Disney)
  MAGIC_KINGDOM: "75ea578a-adc8-4116-a54d-dccb60765ef9",
  EPCOT: "47f90d2c-e191-4239-a466-5892ef59a88b",
  HOLLYWOOD_STUDIOS: "288747d1-8b4f-4a64-867e-ea7c9b27bad8",
  ANIMAL_KINGDOM: "1c84a229-8862-4648-9c71-378ddd2c7693",
  
  // Parks (Universal)
  ISLANDS_OF_ADVENTURE: "267615cc-8943-4c2a-ae2c-5da728ca591f",
  UNIVERSAL_STUDIOS: "eb3f4560-2383-4a36-9152-6b3e5ed6bc57",
  VOLCANO_BAY: "fe78a026-b91b-470c-b906-9d2266b692da",
  EPIC_UNIVERSE: "12dbb85b-265f-44e6-bccf-f1faa17211fc",
}
```

---

## 📥 Exemplos de Request/Response

### GET /v1/destinations
```bash
curl https://api.themeparks.wiki/v1/destinations
```

**Response:**
```json
{
  "destinations": [
    {
      "id": "e957da41-3552-4cf6-b636-5babc5cbc4e5",
      "name": "Walt Disney World® Resort",
      "slug": "waltdisneyworldresort",
      "parks": [
        { "id": "75ea578a-adc8-4116-a54d-dccb60765ef9", "name": "Magic Kingdom Park" },
        { "id": "47f90d2c-e191-4239-a466-5892ef59a88b", "name": "EPCOT" },
        { "id": "288747d1-8b4f-4a64-867e-ea7c9b27bad8", "name": "Disney's Hollywood Studios" },
        { "id": "1c84a229-8862-4648-9c71-378ddd2c7693", "name": "Disney's Animal Kingdom Theme Park" }
      ]
    }
  ]
}
```

---

### GET /v1/entity/{parkId}/live
```bash
curl https://api.themeparks.wiki/v1/entity/75ea578a-adc8-4116-a54d-dccb60765ef9/live
```

**Response (Exemplo Real - Jungle Cruise):**
```json
{
  "id": "75ea578a-adc8-4116-a54d-dccb60765ef9",
  "name": "Magic Kingdom Park",
  "entityType": "PARK",
  "timezone": "America/New_York",
  "liveData": [
    {
      "id": "796b0a25-c51e-456e-9bb8-50a324e301b3",
      "name": "Jungle Cruise",
      "entityType": "ATTRACTION",
      "parkId": "75ea578a-adc8-4116-a54d-dccb60765ef9",
      "externalId": "80010153;entityType=Attraction",
      "status": "OPERATING",
      "queue": {
        "STANDBY": {
          "waitTime": 40
        },
        "RETURN_TIME": {
          "state": "FINISHED",
          "returnStart": null,
          "returnEnd": null
        }
      },
      "forecast": [
        {
          "time": "2026-01-16T08:00:00-05:00",
          "waitTime": 25,
          "percentage": 21
        }
      ],
      "operatingHours": [
        {
          "type": "Operating",
          "startTime": "2026-01-16T08:00:00-05:00",
          "endTime": "2026-01-16T22:00:00-05:00"
        }
      ],
      "lastUpdated": "2026-01-16T22:49:46Z"
    }
  ]
}
```

---

### GET /v1/entity/{parkId}/schedule
```bash
curl https://api.themeparks.wiki/v1/entity/75ea578a-adc8-4116-a54d-dccb60765ef9/schedule
```

**Response (Exemplo Real):**
```json
{
  "id": "75ea578a-adc8-4116-a54d-dccb60765ef9",
  "name": "Magic Kingdom Park",
  "entityType": "PARK",
  "timezone": "America/New_York",
  "schedule": [
    {
      "date": "2026-01-16",
      "type": "TICKETED_EVENT",
      "description": "Early Entry",
      "openingTime": "2026-01-16T07:30:00-05:00",
      "closingTime": "2026-01-16T08:00:00-05:00"
    },
    {
      "date": "2026-01-16",
      "type": "OPERATING",
      "openingTime": "2026-01-16T08:00:00-05:00",
      "closingTime": "2026-01-16T22:00:00-05:00"
    },
    {
      "date": "2026-01-16",
      "type": "INFO",
      "description": "Park Hopping",
      "openingTime": "2026-01-16T14:00:00-05:00",
      "closingTime": "2026-01-16T22:00:00-05:00"
    }
  ]
}
```

---

## 📋 Tipos e Enums

### EntityType
```typescript
type EntityType = "DESTINATION" | "PARK" | "ATTRACTION" | "RESTAURANT" | "HOTEL" | "SHOW"
```

### LiveStatusType
```typescript
type LiveStatusType = "OPERATING" | "DOWN" | "CLOSED" | "REFURBISHMENT"
```

### Queue Types
```typescript
interface LiveQueue {
  STANDBY?: { waitTime: number }
  SINGLE_RIDER?: { waitTime: number | null }
  RETURN_TIME?: {
    state: "AVAILABLE" | "TEMP_FULL" | "FINISHED"
    returnStart: string | null
    returnEnd: string | null
  }
  PAID_RETURN_TIME?: {
    state: "AVAILABLE" | "TEMP_FULL" | "FINISHED"
    returnStart: string | null
    returnEnd: string | null
    price: { amount: number; currency: string; formatted: string }
  }
  BOARDING_GROUP?: {
    allocationStatus: "AVAILABLE" | "PAUSED" | "CLOSED"
    currentGroupStart: number | null
    currentGroupEnd: number | null
    nextAllocationTime: string | null
    estimatedWait: number | null
  }
}
```

### Schedule Types
```typescript
type ScheduleType = "OPERATING" | "TICKETED_EVENT" | "PRIVATE_EVENT" | "EXTRA_HOURS" | "INFO"

interface ScheduleEntry {
  date: string // YYYY-MM-DD
  type: ScheduleType
  openingTime: string // ISO 8601
  closingTime: string // ISO 8601
  description?: string // "Early Entry", "Extended Evening", etc.
}
```

---

## 🛠️ TypeScript Interfaces Completas

```typescript
// lib/connectors/themeParksWikiTypes.ts

export interface ThemeParksDestination {
  id: string
  name: string
  slug: string
  parks: { id: string; name: string }[]
}

export interface ThemeParksEntity {
  id: string
  name: string
  entityType: EntityType
  parkId?: string
  externalId?: string
  location?: { latitude: number; longitude: number }
}

export interface ThemeParksLiveData {
  id: string
  name: string
  entityType: EntityType
  parkId?: string
  status?: LiveStatusType
  queue?: LiveQueue
  forecast?: { time: string; waitTime: number; percentage: number }[]
  operatingHours?: { type: string; startTime: string; endTime: string }[]
  lastUpdated: string
}

export interface ThemeParksParkLiveResponse {
  id: string
  name: string
  entityType: "PARK"
  timezone: string
  liveData: ThemeParksLiveData[]
}

export interface ThemeParksParkScheduleResponse {
  id: string
  name: string
  entityType: "PARK"
  timezone: string
  schedule: ScheduleEntry[]
}
```

---

## Proposed Changes

### Fase 1: Novo Conector

#### [NEW] [themeParksWikiConnector.ts](file:///c:/Users/Danilo%20Fiorotto/Documents/programacao/Otimizator/lib/connectors/themeParksWikiConnector.ts)

```typescript
const THEMEPARKS_API = "https://api.themeparks.wiki/v1"

export async function fetchDestinations(): Promise<ThemeParksDestination[]> {
  const res = await fetch(`${THEMEPARKS_API}/destinations`)
  const data = await res.json()
  return data.destinations
}

export async function fetchParkLiveData(parkId: string): Promise<ThemeParksParkLiveResponse> {
  const res = await fetch(`${THEMEPARKS_API}/entity/${parkId}/live`)
  return res.json()
}

export async function fetchParkSchedule(parkId: string): Promise<ThemeParksParkScheduleResponse> {
  const res = await fetch(`${THEMEPARKS_API}/entity/${parkId}/schedule`)
  return res.json()
}

export async function processThemeParksPark(
  themeParksId: string, 
  internalParkId: string
): Promise<void> {
  const liveData = await fetchParkLiveData(themeParksId)
  
  for (const entity of liveData.liveData) {
    if (entity.entityType !== "ATTRACTION") continue
    
    // Upsert attraction
    const attraction = await upsertAttraction({
      park_id: internalParkId,
      name: entity.name,
      // ... outros campos
    })
    
    // Save wait sample com dados extras
    await insertWaitSample({
      attraction_id: attraction.id,
      sampled_at: entity.lastUpdated,
      wait_minutes: entity.queue?.STANDBY?.waitTime ?? 0,
      is_open: entity.status === "OPERATING",
      single_rider_wait: entity.queue?.SINGLE_RIDER?.waitTime,
      return_time_state: entity.queue?.RETURN_TIME?.state,
      // ... outros campos
    })
  }
}
```

---

### Fase 2: Schema Updates

#### [MODIFY] [schema.ts](file:///c:/Users/Danilo%20Fiorotto/Documents/programacao/Otimizator/lib/db/schema.ts)

```diff
export type WaitSample = {
  id: string
  attraction_id: string
  sampled_at: string
  wait_minutes: number
  is_open: boolean
+ single_rider_wait: number | null
+ return_time_state: string | null
+ return_time_start: string | null
+ return_time_end: string | null
+ boarding_group_status: string | null
+ lightning_lane_price: number | null
}
```

---

### Fase 3-7: [Sem alterações no escopo técnico]

Ver versão anterior do plano para detalhes.

---

## Verification Plan

### Automated Tests
```bash
# Testar API diretamente
curl https://api.themeparks.wiki/v1/destinations | jq '.destinations | length'
# Esperado: ~80+ destinos

curl https://api.themeparks.wiki/v1/entity/75ea578a-adc8-4116-a54d-dccb60765ef9/live | jq '.liveData | length'
# Esperado: ~40+ atrações
```

### Manual Verification
1. Reiniciar servidor
2. Acessar /app/statistics
3. Verificar se parques carregam
4. Verificar se wait times aparecem
5. Verificar se calendário funciona

---

## Timeline Estimado

| Fase | Duração |
|------|---------|
| 1. Novo Conector | 1-2h |
| 2. Schema Updates | 30min |
| 3-7. Demais fases | 3h |
| **Total** | **5-6h** |
