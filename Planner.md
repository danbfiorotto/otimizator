um pacote completo de entrega V1: IA/planejadores, arquitetura, rotas, APIs, schema SQL (Supabase/Postgres), contratos TypeScript (DTOs), UI/UX, cron/ingestão, caching, colaboração em grupo, e config Vercel.

Fontes que vamos usar no V1

Queue-Times Real Time API (fila + open/closed; update ~5 min; exige atribuição “Powered by Queue-Times.com”). 
Queue Times
+1

Queue-Times Crowd Calendar (HTML) (crowd % por dia + horas/early entry/eventos; preditivo). 
Queue Times

Queue-Times Stats (HTML) (crowd por mês/dia da semana/ano e ranking; ótimo pra decisão “qual parque em qual dia” sem precisar esperar meses coletando). 
Queue Times

ThemeParks.wiki v1 API (schedule/horários e live data como fallback/validação). 
api.themeparks.wiki
+2
api.themeparks.wiki
+2

0) Objetivo do V1 (escopo fechado)

Usuário (grupo) consegue:

Criar uma viagem (datas) e escolher parques desejados

O app sugere automaticamente qual parque em qual dia, com justificativas (“crowd% menor”, “horário mais longo”, “evitar 2 dias pesados seguidos”, etc.) usando crowd calendar/stats 
Queue Times
+1

Para cada dia, montar um itinerário de atrações por horário, com:

horário do parque, deslocamentos, almoço, janelas fixas

fila esperada (p50/p80) e risco de downtime

modo ao vivo (replano com a API a cada ~5 min) 
Queue Times

Compartilhar com o grupo (colaboração) e exportar roteiro

1) Stack Vercel-first (V1 “de verdade”)
Frontend

Next.js (App Router) + TypeScript

TailwindCSS + shadcn/ui

TanStack Query (cache/poll do live)

dnd-kit (drag & drop no calendário e reorder de timeline)

Recharts (gráficos / heatmaps simples)

Zod (validação de DTO e forms)

Map (opcional V1): Mapbox/Leaflet apenas se você quiser; dá pra fazer sem.

Backend (na Vercel)

Route Handlers em app/api/*

Vercel Cron chamando endpoints internos

Cheerio (parse de HTML do Queue-Times stats/calendar)

Rate limiting (Upstash Redis / Vercel KV)

Dados

Supabase Postgres (recomendado)

Supabase Auth

Supabase Storage (exports)

Vercel KV (Upstash): snapshot “live” por parque (rápido) + locks de cron

2) Arquitetura geral (componentes)
2.1 Camadas

Connectors

QueueTimesRealtime (JSON) 
Queue Times

QueueTimesCalendar (HTML) 
Queue Times

QueueTimesStats (HTML) 
Queue Times

ThemeParksWiki (JSON) 
api.themeparks.wiki
+1

Normalizer

converte tudo para seus IDs internos: park_uuid, attraction_uuid

Storage

Postgres: histórico + agregados

KV: “último snapshot” e cache curto

Planner Engine

Park Day Optimizer (calendário de parques)

Day Itinerary Optimizer (ordem de atrações)

Serving API

endpoints prontos para o front consumir (com caching)

3) Estrutura do repositório (Next.js)
/app
  /(public)
    page.tsx
    pricing/page.tsx
    legal/page.tsx
  /(auth)
    login/page.tsx
    callback/page.tsx
  /app
    layout.tsx
    dashboard/page.tsx
    trips/page.tsx
    trips/[tripId]/page.tsx
    trips/[tripId]/calendar/page.tsx
    trips/[tripId]/days/[date]/page.tsx
    trips/[tripId]/days/[date]/plan/page.tsx
    trips/[tripId]/stats/page.tsx
    trips/[tripId]/settings/page.tsx

/app/api
  /health/route.ts
  /auth/supabase/route.ts
  /parks/route.ts
  /parks/[parkId]/route.ts
  /parks/[parkId]/live/route.ts
  /parks/[parkId]/calendar/route.ts
  /parks/[parkId]/stats/route.ts
  /trips/route.ts
  /trips/[tripId]/route.ts
  /trips/[tripId]/optimize/route.ts
  /trips/[tripId]/days/[date]/plan/route.ts
  /trips/[tripId]/days/[date]/replan/route.ts
  /exports/[tripId]/route.ts

  /cron
    /queuetimes_live/route.ts
    /queuetimes_calendar/route.ts
    /queuetimes_stats/route.ts
    /themeparks_schedule/route.ts
    /aggregate_hourly/route.ts
    /aggregate_daily/route.ts

/lib
  /connectors
    queueTimesRealtime.ts
    queueTimesCalendarScraper.ts
    queueTimesStatsScraper.ts
    themeParksWiki.ts
  /planner
    parkDayOptimizer.ts
    itineraryOptimizer.ts
    scoring.ts
  /db
    supabaseServer.ts
    queries.ts
    schema.ts (types)
  /dto
    zod.ts
  /utils
    time.ts
    cache.ts
    rateLimit.ts
/components
  CalendarBoard.tsx
  DayTimeline.tsx
  RidePicker.tsx
  ScoreBadges.tsx
  Heatmap.tsx

4) Rotas do App (UI) e UX por tela
4.1 Fluxo principal (UX)

/app/trips → criar viagem

Wizard:

datas (check-in/out)

parques desejados

preferências e restrições

/app/trips/[tripId]/calendar

calendário drag & drop com sugestões

“Fixar” um parque num dia (lock)

/app/trips/[tripId]/days/[date]

escolher atrações e preferências do dia

/plan

timeline gerada + editar manualmente

modo ao vivo

replano rápido (swap) usando live queue times 
Queue Times

4.2 UI detalhada (componentes)

Calendário

Card do dia: data, dia da semana, horas do parque (se definido), crowd% (se disponível) 
Queue Times

Card do parque: nome, “peso” (intenso/leve), crowd score base

Sidebar “Sugestões”: ranking de 1º/2º/3º melhor encaixe

Dia

“Checklist de atrações” com prioridade: Must / Want / Optional

Campos: hora chegada, almoço, buffers, tempo de caminhada padrão

Timeline

Cada item: atração, janela (start/end), fila esperada, caminhada, risco

Botões: “Otimizar novamente”, “Modo ao vivo”, “Exportar”

Stats

Heatmap hora x dia da semana (por atração e por parque)

“Melhor horário” (p50/p80) + “mais instáveis” (downtime)

Obrigatório

Footer fixo: Powered by Queue-Times.com com link (compliance) 
Queue Times

5) Camada de dados: Schema SQL (Supabase/Postgres)

Abaixo é um schema V1 completo. Use uuid e RLS.

5.1 DDL (SQL)
-- Extensions (Supabase já costuma ter)
create extension if not exists "pgcrypto";

-- ---------- Core: Parks & Attractions ----------
create table if not exists parks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  country text,
  timezone text not null, -- ex: America/New_York
  lat double precision,
  lng double precision,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists attractions (
  id uuid primary key default gen_random_uuid(),
  park_id uuid not null references parks(id) on delete cascade,
  name text not null,
  land_name text,                -- ex: Tomorrowland
  attraction_type text,          -- ride/show/meet/etc
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique(park_id, name)
);

-- Mapeia IDs externos (Queue-Times, ThemeParks.wiki) pros IDs internos
create table if not exists source_mappings (
  id uuid primary key default gen_random_uuid(),
  source text not null,          -- 'queue_times' | 'themeparks_wiki'
  entity_type text not null,     -- 'park' | 'attraction'
  source_id text not null,
  internal_id uuid not null,     -- parks.id ou attractions.id
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(source, entity_type, source_id)
);

create index if not exists idx_source_mappings_internal on source_mappings(internal_id);

-- ---------- Live samples ----------
-- Amostras a cada 5 min do Queue-Times (UTC)
create table if not exists wait_samples (
  id bigserial primary key,
  attraction_id uuid not null references attractions(id) on delete cascade,
  sampled_at timestamptz not null,       -- UTC
  is_open boolean not null,
  wait_minutes int not null,             -- 0..N (se closed, vem 0 mas cruzar com is_open)
  raw jsonb not null default '{}'::jsonb
);

create index if not exists idx_wait_samples_attr_time on wait_samples(attraction_id, sampled_at desc);
create index if not exists idx_wait_samples_time on wait_samples(sampled_at desc);

-- ---------- Park hours / calendar (predito + horários) ----------
create table if not exists park_calendar_days (
  id bigserial primary key,
  park_id uuid not null references parks(id) on delete cascade,
  date date not null,
  crowd_percent int,                    -- 0-100 (quando disponível no calendar) :contentReference[oaicite:13]{index=13}
  open_time_local time,                -- local do parque
  close_time_local time,
  early_entry_start time,
  early_entry_end time,
  has_ticketed_event boolean,
  has_extended_evening boolean,
  is_public_holiday boolean,
  is_rainy_day boolean,
  raw jsonb not null default '{}'::jsonb,
  unique(park_id, date)
);

create index if not exists idx_park_calendar_days_park_date on park_calendar_days(park_id, date);

-- ---------- Aggregations (para performance) ----------
-- Crowd index do parque por dia (baseado em atrações principais) - seu cálculo
create table if not exists park_day_scores (
  id bigserial primary key,
  park_id uuid not null references parks(id) on delete cascade,
  date date not null,
  crowd_score numeric(6,3) not null, -- 0..1 ou 0..100 (você decide)
  method text not null,              -- 'calendar' | 'computed' | 'hybrid'
  computed_at timestamptz not null default now(),
  unique(park_id, date, method)
);

-- Estatísticas por atração: mês + dia_semana + hora
create table if not exists attraction_hour_stats (
  id bigserial primary key,
  attraction_id uuid not null references attractions(id) on delete cascade,
  month int not null check (month between 1 and 12),
  dow int not null check (dow between 0 and 6),           -- 0=Sun
  hour int not null check (hour between 0 and 23),
  p50 int,
  p80 int,
  p95 int,
  open_rate numeric(5,4), -- 0..1
  sample_count int not null,
  updated_at timestamptz not null default now(),
  unique(attraction_id, month, dow, hour)
);

create index if not exists idx_attraction_hour_stats_lookup
  on attraction_hour_stats(attraction_id, month, dow, hour);

-- ---------- Users / Groups / Trips ----------
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  unique(group_id, user_id)
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  destination text not null default 'Orlando',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  date date not null,
  notes text,
  unique(trip_id, date)
);

-- Parque atribuído ao dia (pode ser null se "livre")
create table if not exists trip_day_assignments (
  id uuid primary key default gen_random_uuid(),
  trip_day_id uuid not null references trip_days(id) on delete cascade,
  park_id uuid references parks(id),
  is_locked boolean not null default false, -- usuário travou
  source text not null default 'user',      -- 'user'|'optimizer'
  score_breakdown jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(trip_day_id)
);

-- Plano do dia (várias versões)
create table if not exists day_plans (
  id uuid primary key default gen_random_uuid(),
  trip_day_id uuid not null references trip_days(id) on delete cascade,
  version int not null,
  status text not null check (status in ('draft','final')),
  inputs jsonb not null default '{}'::jsonb, -- preferências, must-do etc
  created_at timestamptz not null default now(),
  unique(trip_day_id, version)
);

create table if not exists day_plan_items (
  id uuid primary key default gen_random_uuid(),
  day_plan_id uuid not null references day_plans(id) on delete cascade,
  order_index int not null,
  attraction_id uuid references attractions(id),
  title text not null,                      -- fallback (ex: "Almoço")
  item_type text not null check (item_type in ('ride','show','meal','buffer','travel')),
  start_time_local time,
  end_time_local time,
  expected_wait int,
  expected_walk int,
  risk_score numeric(6,3),
  meta jsonb not null default '{}'::jsonb,
  unique(day_plan_id, order_index)
);

-- Auditoria simples (colaboração)
create table if not exists audit_events (
  id bigserial primary key,
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

5.2 RLS (padrão V1)

groups: somente membros

trips: somente membros do grupo

wait_samples/stats: público (ou “anon read”) se você quiser; mas recomendo manter privado e expor via API.

6) Contratos (DTOs) e Tipos (TypeScript)

Isso define exatamente o que o front consome.

6.1 DTOs base
export type ParkDTO = {
  id: string;          // uuid
  slug: string;
  name: string;
  timezone: string;    // "America/New_York"
};

export type ParkCalendarDayDTO = {
  parkId: string;
  date: string;        // YYYY-MM-DD
  crowdPercent?: number;     // 0-100 (predito) :contentReference[oaicite:14]{index=14}
  openTimeLocal?: string;    // "08:00"
  closeTimeLocal?: string;   // "23:00"
  earlyEntry?: { start: string; end: string } | null;
  flags: {
    publicHoliday?: boolean;
    rainyDay?: boolean;
    ticketedEvent?: boolean;
    extendedEvening?: boolean;
  };
  source: "queue_times_calendar" | "themeparks_wiki" | "unknown";
};

export type AttractionDTO = {
  id: string;
  parkId: string;
  name: string;
  landName?: string | null;
  type?: string | null;
  isArchived: boolean;
};

export type AttractionLiveDTO = {
  attractionId: string;
  isOpen: boolean;
  waitMinutes: number;
  lastUpdatedUtc: string; // ISO
};

export type AttractionStatsHourDTO = {
  attractionId: string;
  month: number; // 1-12
  dow: number;   // 0=Sun
  hour: number;  // 0-23
  p50?: number;
  p80?: number;
  p95?: number;
  openRate?: number;   // 0..1
  sampleCount: number;
};

6.2 Otimizador de parques por dia — contrato
export type TripOptimizeRequest = {
  tripId: string;
  parksToSchedule: string[]; // park uuids
  constraints: {
    restDays?: number;            // ex: 1
    avoidWeekendsFor?: string[];  // park ids
    maxHeavyStreak?: number;      // ex: 2
    lockedAssignments?: Array<{ date: string; parkId: string }>;
  };
  weights: {
    crowd: number;
    hours: number;
    weekendPenalty: number;
    travelDayPenalty: number;
  };
};

export type TripOptimizeResponse = {
  tripId: string;
  assignments: Array<{
    date: string;
    parkId: string | null;
    score: number; // menor = melhor
    breakdown: Record<string, number>;
    source: "optimizer";
  }>;
  alternatives: Array<{
    name: string; // "Plano B"
    assignments: Array<{ date: string; parkId: string | null; score: number }>;
  }>;
};

6.3 Planner do dia — contrato
export type DayPlanRequest = {
  tripId: string;
  date: string;           // YYYY-MM-DD
  parkId: string;
  arrivalTimeLocal: string; // "08:10"
  lunchWindow?: { start: string; end: string }; // "12:30"-"13:00"
  walkMinutesDefault: number; // ex 10
  mode: "p50" | "p80";     // robustez
  mustDoAttractionIds: string[];
  wantAttractionIds?: string[];
  fixedItems?: Array<{
    type: "show" | "meal";
    title: string;
    startTimeLocal: string;
    endTimeLocal: string;
  }>;
  liveBias?: {
    enabled: boolean;
    maxWaitAcceptable?: number; // ex 60
  };
};

export type DayPlanResponse = {
  tripId: string;
  date: string;
  parkId: string;
  parkHours?: { open: string; close: string }; // local
  version: number;
  items: Array<{
    orderIndex: number;
    type: "ride" | "show" | "meal" | "buffer" | "travel";
    title: string;
    attractionId?: string;
    startTimeLocal: string;
    endTimeLocal: string;
    expectedWait?: number;
    expectedWalk?: number;
    riskScore?: number;
    explanation?: string[];
  }>;
  metrics: {
    totalPlannedRides: number;
    totalExpectedWait: number;
    totalWalk: number;
    slackMinutes: number;
  };
};

7) APIs internas (Route Handlers) — contrato + comportamento
7.1 Públicos do app

GET /api/parks → lista parques disponíveis

GET /api/parks/{parkId}/calendar?start=YYYY-MM-DD&end=... → dias com crowd%/hours 
Queue Times

GET /api/parks/{parkId}/stats → crowd by dow/month + top rides (se necessário) 
Queue Times

GET /api/parks/{parkId}/live → snapshot “agora” (cacheado 60–120s) 
Queue Times

POST /api/trips/{tripId}/optimize → sugere parques por dia

POST /api/trips/{tripId}/days/{date}/plan → gera plano

POST /api/trips/{tripId}/days/{date}/replan → replano usando live

7.2 Cron (Vercel Cron)

GET /api/cron/queuetimes_live (a cada 5 min) 
Queue Times

GET /api/cron/queuetimes_calendar (1x/dia ou a cada 6h para próximos 60 dias) 
Queue Times

GET /api/cron/queuetimes_stats (1x/dia ou 1x/semana) 
Queue Times

GET /api/cron/themeparks_schedule (1x/dia; fallback/validação) 
api.themeparks.wiki

GET /api/cron/aggregate_hourly (1x/h)

GET /api/cron/aggregate_daily (1x/dia)

8) Ingestão: lógica completa (Queue-Times + Scrapers)
8.1 Queue-Times Real Time (JSON)

Regra: atualizar a cada ~5 min (igual a fonte). 
Queue Times

Fluxo:

buscar parks.json raramente (1x/semana)

para cada parkId (Orlando + selecionados), buscar parks/{id}/queue_times.json

normalizar rides → attractions (upsert)

gravar wait_samples

Pontos críticos

wait_time=0 precisa cruzar com is_open (0 pode ser walk-on ou closed) 
Queue Times

timestamps vêm UTC (converter no front apenas para display)

8.2 Queue-Times Crowd Calendar (HTML)

A página mostra por dia: crowd%, early entry e horas (ex.: “08:00–23:00”). 
Queue Times

Fluxo:

para cada parque e mês relevante (próximos 6–12 meses), fetch HTML

parse e gerar linhas em park_calendar_days

Notas de produto

mostrar badge “predição” e “horário sujeito a mudança” (é crowd calendar, não fonte oficial) 
Queue Times

8.3 Queue-Times Stats (HTML)

Essa página já entrega:

crowd por mês e por dia da semana (all time + por ano)

top rides por média

(e mais) 
Queue Times

Fluxo:

fetch HTML /parks/{id}/stats (e opcional /stats/{year})

parse tabelas:

crowd by month

crowd by dow

top rides avg

salvar em tabelas auxiliares (park_day_scores por dia pode vir do calendar; stats ajudam para “prior” por DOW/Mês)

9) Agregações estatísticas (para planner rápido)
9.1 attraction_hour_stats (p50/p80/p95 + open_rate)

Job hourly:

pega últimas N semanas/meses (rolling window)

agrupa por (attraction_id, month, dow, hour)

calcula percentis + open_rate + sample_count

grava em attraction_hour_stats

9.2 park_day_scores (score do parque)

Para cada dia:

se houver crowd_percent do calendar, cria method='calendar'

se não houver, calcula method='computed' a partir das atrações principais (p80 médio das top N)

pode fazer hybrid combinando ambos

10) Planner Engine (lógicas e raciocínios)
10.1 Park Day Optimizer (qual parque em qual dia)
Entrada

conjunto de dias da viagem

conjunto de parques desejados

restrições/travas

score por (park, date)

Custo V1 (simples e forte)

cost(park, date) = wCrowd*crowd + wHours*hoursPenalty + wWeekend*weekendPenalty + wTravel*travelPenalty + wStreak*heavyStreakPenalty

crowd: pega do park_calendar_days.crowd_percent quando existir 
Queue Times

hoursPenalty: penaliza dias com menos horas

weekendPenalty: sábado/domingo

travelPenalty: primeiro/último dia

heavyStreakPenalty: dois parques pesados seguidos

Algoritmo V1 (implementável e ótimo)

preenche locked days

greedy: para cada dia livre, escolhe o parque restante com menor custo

melhoria local: tenta swaps (dia A <-> dia B) enquanto melhora score total

gera Plano A/B/C guardando 2–3 ótimos locais

10.2 Itinerary Optimizer (ordem de atrações no dia)
Entrada

park hours (open/close)

lista de atrações Must/Want

walk default (10 min) + buffers

modo (p50 ou p80)

Custo por candidato “próxima atração”

stepCost = expectedWait(t) + walk + riskDowntime(t) + latenessPenalty(shows/lunch)

expectedWait(t): usa attraction_hour_stats (p50/p80) e ajusta com live se enabled

riskDowntime(t): 1 - open_rate no bucket (mês/dow/hora)

Heurística V1

timeline em slots de 5 min

prioriza “rope drop” (primeiro bloco) para Must com maior p80

respeita janelas fixas (lunch/shows)

recalcula a cada mudança

Replan (modo ao vivo)

puxa /api/parks/{parkId}/live (cache curto) 
Queue Times

se atração fechou ou fila explodiu, faz swap local:

remove item

escolhe alternativa com menor stepCost agora

mantém o resto (evita “bagunçar tudo”)

11) UI/UX “pronta para produção” (V1)
11.1 Calendar Board (drag & drop)

colunas: dias

cards: parques

cada dia mostra:

crowd% (se disponível)

horas (open/close)

badge (early entry/event) 
Queue Times

botão “Otimizar” (gera Plano A e mostra diff)

botão “Alternativas” (Plano B/C)

11.2 Day Planner

topo: park hours + avisos

seletor Must/Want

inputs: chegada, almoço, walk default, modo p50/p80

botão “Gerar plano”

timeline editável

11.3 Live Mode

banner: “Atualiza a cada ~5 min” 
Queue Times

botão “Replan agora”

sugestões rápidas (“Trocar para X: caiu pra 15 min”)

11.4 Stats

heatmap por atração: hora x DOW

ranking “melhores horários”

ranking “instáveis” (downtime)

12) Deploy na Vercel (config prática)
Cron (exemplo conceitual)

/api/cron/queuetimes_live → */5 * * * *

/api/cron/aggregate_hourly → 0 * * * *

/api/cron/queuetimes_calendar → 0 */6 * * *

/api/cron/queuetimes_stats → 0 3 * * *

/api/cron/themeparks_schedule → 0 4 * * *

Env vars

SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

KV_REST_API_URL, KV_REST_API_TOKEN (Upstash)

CRON_SECRET

QUEUE_TIMES_ATTRIBUTION_URL (hardcode ok)

THEMEPARKS_BASE_URL=https://api.themeparks.wiki/v1 
GitHub

13) Confiabilidade, limites e compliance

Exibir “Powered by Queue-Times.com” com link sempre (footer global) 
Queue Times

Cache agressivo nos seus endpoints: live 60–120s, calendar 6h, stats 24h

Rate limit por IP e por grupo

Locks no cron via KV (evita rodar duplicado)

14) “Próximos arquivos” que você vai querer no projeto (já definidos)

lib/connectors/*.ts com parsers (JSON + HTML via Cheerio)

lib/planner/*.ts com scoring + otimizações

migrations SQL (o DDL acima)

dto/zod.ts com schemas espelhando os DTOs (forms e API)