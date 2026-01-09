-- Migration: Convert to password-based groups (no user authentication)
-- This removes dependency on Supabase Auth and uses simple password-based access

-- Add password hash to groups
alter table groups 
  add column if not exists password_hash text not null default '',
  alter column owner_user_id drop not null;

-- Create index for faster password lookups (if needed)
create index if not exists idx_groups_password on groups(password_hash) where password_hash != '';

-- Remove RLS policies that depend on auth.uid()
drop policy if exists "Groups are viewable by members" on groups;
drop policy if exists "Groups are insertable by owner" on groups;
drop policy if exists "Groups are updatable by owner" on groups;
drop policy if exists "Group members are viewable by group members" on group_members;
drop policy if exists "Group members are insertable by owner/admin" on group_members;
drop policy if exists "Trips are viewable by group members" on trips;
drop policy if exists "Trips are insertable by group members" on trips;
drop policy if exists "Trips are updatable by group members" on trips;
drop policy if exists "Trip days are viewable by group members" on trip_days;
drop policy if exists "Trip days are insertable by group members" on trip_days;
drop policy if exists "Trip days are updatable by group members" on trip_days;
drop policy if exists "Trip day assignments are viewable by group members" on trip_day_assignments;
drop policy if exists "Trip day assignments are insertable by group members" on trip_day_assignments;
drop policy if exists "Trip day assignments are updatable by group members" on trip_day_assignments;
drop policy if exists "Day plans are viewable by group members" on day_plans;
drop policy if exists "Day plans are insertable by group members" on day_plans;
drop policy if exists "Day plans are updatable by group members" on day_plans;
drop policy if exists "Day plan items are viewable by group members" on day_plan_items;
drop policy if exists "Day plan items are insertable by group members" on day_plan_items;
drop policy if exists "Day plan items are updatable by group members" on day_plan_items;
drop policy if exists "Audit events are viewable by group members" on audit_events;
drop policy if exists "Audit events are insertable by group members" on audit_events;

-- Disable RLS (we'll handle access control via application logic with passwords)
alter table groups disable row level security;
alter table group_members disable row level security;
alter table trips disable row level security;
alter table trip_days disable row level security;
alter table trip_day_assignments disable row level security;
alter table day_plans disable row level security;
alter table day_plan_items disable row level security;
alter table audit_events disable row level security;

-- Update groups table: make password_hash required for new groups
-- (existing groups with empty password will need to be updated via app)
alter table groups 
  alter column password_hash drop default;

-- Add slug for easier sharing (optional, but useful)
alter table groups 
  add column if not exists slug text unique;

-- Create function to generate slug from name
create or replace function generate_group_slug(group_name text) returns text as $$
declare
  base_slug text;
  final_slug text;
  counter int := 0;
begin
  -- Convert to lowercase, remove special chars, replace spaces with hyphens
  base_slug := lower(regexp_replace(group_name, '[^a-z0-9]+', '-', 'gi'));
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Ensure uniqueness
  while exists (select 1 from groups where slug = final_slug) loop
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  end loop;
  
  return final_slug;
end;
$$ language plpgsql;
