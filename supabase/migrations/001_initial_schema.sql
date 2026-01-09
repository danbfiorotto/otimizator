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
  crowd_percent int,                    -- 0-100 (quando disponível no calendar)
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

-- ---------- RLS Policies ----------

-- Habilitar RLS em todas as tabelas
alter table groups enable row level security;
alter table group_members enable row level security;
alter table trips enable row level security;
alter table trip_days enable row level security;
alter table trip_day_assignments enable row level security;
alter table day_plans enable row level security;
alter table day_plan_items enable row level security;
alter table audit_events enable row level security;

-- Groups: somente membros podem ver
create policy "Groups are viewable by members"
  on groups for select
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
    )
  );

-- Group members: somente membros do grupo podem ver
create policy "Group members are viewable by group members"
  on group_members for select
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
    )
  );

-- Trips: somente membros do grupo podem ver
create policy "Trips are viewable by group members"
  on trips for select
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = trips.group_id
      and group_members.user_id = auth.uid()
    )
  );

-- Trip days: somente membros do grupo podem ver
create policy "Trip days are viewable by group members"
  on trip_days for select
  using (
    exists (
      select 1 from trips
      join group_members on group_members.group_id = trips.group_id
      where trips.id = trip_days.trip_id
      and group_members.user_id = auth.uid()
    )
  );

-- Trip day assignments: somente membros do grupo podem ver
create policy "Trip day assignments are viewable by group members"
  on trip_day_assignments for select
  using (
    exists (
      select 1 from trip_days
      join trips on trips.id = trip_days.trip_id
      join group_members on group_members.group_id = trips.group_id
      where trip_days.id = trip_day_assignments.trip_day_id
      and group_members.user_id = auth.uid()
    )
  );

-- Day plans: somente membros do grupo podem ver
create policy "Day plans are viewable by group members"
  on day_plans for select
  using (
    exists (
      select 1 from trip_days
      join trips on trips.id = trip_days.trip_id
      join group_members on group_members.group_id = trips.group_id
      where trip_days.id = day_plans.trip_day_id
      and group_members.user_id = auth.uid()
    )
  );

-- Day plan items: somente membros do grupo podem ver
create policy "Day plan items are viewable by group members"
  on day_plan_items for select
  using (
    exists (
      select 1 from day_plans
      join trip_days on trip_days.id = day_plans.trip_day_id
      join trips on trips.id = trip_days.trip_id
      join group_members on group_members.group_id = trips.group_id
      where day_plans.id = day_plan_items.day_plan_id
      and group_members.user_id = auth.uid()
    )
  );

-- Audit events: somente membros do grupo podem ver
create policy "Audit events are viewable by group members"
  on audit_events for select
  using (
    exists (
      select 1 from trips
      join group_members on group_members.group_id = trips.group_id
      where trips.id = audit_events.trip_id
      and group_members.user_id = auth.uid()
    )
  );

-- Policies para insert/update/delete (apenas membros com role owner/admin)
-- Groups: owner pode criar, admin/owner podem atualizar
create policy "Groups are insertable by authenticated users"
  on groups for insert
  with check (auth.uid() = owner_user_id);

create policy "Groups are updatable by owner"
  on groups for update
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
      and group_members.role in ('owner', 'admin')
    )
  );

-- Group members: owner/admin podem adicionar
create policy "Group members are insertable by owner/admin"
  on group_members for insert
  with check (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
    )
  );

-- Trips: membros do grupo podem criar/atualizar
create policy "Trips are insertable by group members"
  on trips for insert
  with check (
    exists (
      select 1 from group_members
      where group_members.group_id = trips.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Trips are updatable by group members"
  on trips for update
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = trips.group_id
      and group_members.user_id = auth.uid()
    )
  );

-- Trip days: membros do grupo podem criar/atualizar
create policy "Trip days are insertable by group members"
  on trip_days for insert
  with check (
    exists (
      select 1 from trips
      join group_members on group_members.group_id = trips.group_id
      where trips.id = trip_days.trip_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Trip days are updatable by group members"
  on trip_days for update
  using (
    exists (
      select 1 from trips
      join group_members on group_members.group_id = trips.group_id
      where trips.id = trip_days.trip_id
      and group_members.user_id = auth.uid()
    )
  );

-- Trip day assignments: membros do grupo podem criar/atualizar
create policy "Trip day assignments are insertable by group members"
  on trip_day_assignments for insert
  with check (
    exists (
      select 1 from trip_days
      join trips on trips.id = trip_days.trip_id
      join group_members on group_members.group_id = trips.group_id
      where trip_days.id = trip_day_assignments.trip_day_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Trip day assignments are updatable by group members"
  on trip_day_assignments for update
  using (
    exists (
      select 1 from trip_days
      join trips on trips.id = trip_days.trip_id
      join group_members on group_members.group_id = trips.group_id
      where trip_days.id = trip_day_assignments.trip_day_id
      and group_members.user_id = auth.uid()
    )
  );

-- Day plans: membros do grupo podem criar/atualizar
create policy "Day plans are insertable by group members"
  on day_plans for insert
  with check (
    exists (
      select 1 from trip_days
      join trips on trips.id = trip_days.trip_id
      join group_members on group_members.group_id = trips.group_id
      where trip_days.id = day_plans.trip_day_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Day plans are updatable by group members"
  on day_plans for update
  using (
    exists (
      select 1 from trip_days
      join trips on trips.id = trip_days.trip_id
      join group_members on group_members.group_id = trips.group_id
      where trip_days.id = day_plans.trip_day_id
      and group_members.user_id = auth.uid()
    )
  );

-- Day plan items: membros do grupo podem criar/atualizar
create policy "Day plan items are insertable by group members"
  on day_plan_items for insert
  with check (
    exists (
      select 1 from day_plans
      join trip_days on trip_days.id = day_plans.trip_day_id
      join trips on trips.id = trip_days.trip_id
      join group_members on group_members.group_id = trips.group_id
      where day_plans.id = day_plan_items.day_plan_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Day plan items are updatable by group members"
  on day_plan_items for update
  using (
    exists (
      select 1 from day_plans
      join trip_days on trip_days.id = day_plans.trip_day_id
      join trips on trips.id = trip_days.trip_id
      join group_members on group_members.group_id = trips.group_id
      where day_plans.id = day_plan_items.day_plan_id
      and group_members.user_id = auth.uid()
    )
  );

-- Audit events: membros do grupo podem criar
create policy "Audit events are insertable by group members"
  on audit_events for insert
  with check (
    exists (
      select 1 from trips
      join group_members on group_members.group_id = trips.group_id
      where trips.id = audit_events.trip_id
      and group_members.user_id = auth.uid()
    )
  );
