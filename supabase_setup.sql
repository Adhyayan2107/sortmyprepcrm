-- ============================================================
-- sortmyprepCRM — Phase 1 Database Setup
-- Run this in Supabase SQL Editor (Project → SQL Editor → New Query)
-- ============================================================

-- 1. USERS TABLE (extends Supabase auth.users)
create table if not exists public.users (
  id        uuid primary key references auth.users(id) on delete cascade,
  name      text,
  role      text not null default 'rep' check (role in ('admin', 'rep')),
  countries text[]
);

alter table public.users enable row level security;

create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);


-- 2. LEADS TABLE
create table if not exists public.leads (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  country        text not null,
  city           text,
  lat            float,
  lng            float,
  website        text,
  phone          text,
  email          text,
  curriculum     text[],
  source         text,
  stage          text not null default 'New Lead',
  assigned_to    uuid references public.users(id) on delete set null,
  notes          text,
  intel_brief    text,
  created_at     timestamptz not null default now(),
  last_activity  timestamptz not null default now()
);

alter table public.leads enable row level security;

-- Phase 1: all authenticated users can read/write leads
-- (Phase 2 will tighten this per-role)
create policy "Authenticated users can read leads"
  on public.leads for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert leads"
  on public.leads for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update leads"
  on public.leads for update
  using (auth.role() = 'authenticated');


-- 3. ACTIVITY_LOG TABLE
create table if not exists public.activity_log (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid not null references public.leads(id) on delete cascade,
  type           text not null check (type in ('note','call','meeting','stage_change','email')),
  summary        text,
  outcome        text,
  done_by        uuid references public.users(id) on delete set null,
  from_stage     text,
  to_stage       text,
  fathom_id      text,
  callhippo_id   text,
  recording_url  text,
  created_at     timestamptz not null default now()
);

alter table public.activity_log enable row level security;

create policy "Authenticated users can read activity"
  on public.activity_log for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own activity"
  on public.activity_log for insert
  with check (auth.uid() = done_by);


-- 4. SCRIPTS TABLE (Phase 3 — create now so schema is ready)
create table if not exists public.scripts (
  id           uuid primary key default gen_random_uuid(),
  contact_type text not null,
  title        text not null,
  content      text,
  usage_count  int not null default 0,
  created_by   uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  archived     boolean not null default false
);

alter table public.scripts enable row level security;

create policy "Authenticated users can read scripts"
  on public.scripts for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert scripts"
  on public.scripts for insert
  with check (auth.role() = 'authenticated');

create policy "Creator or admin can update scripts"
  on public.scripts for update
  using (auth.uid() = created_by);


-- 5. SCRIPT_RATINGS TABLE (Phase 3)
create table if not exists public.script_ratings (
  id         uuid primary key default gen_random_uuid(),
  script_id  uuid not null references public.scripts(id) on delete cascade,
  rated_by   uuid references public.users(id) on delete set null,
  rating     int check (rating between 1 and 5),
  note       text,
  created_at timestamptz not null default now()
);

alter table public.script_ratings enable row level security;

create policy "Authenticated users can read ratings"
  on public.script_ratings for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own rating"
  on public.script_ratings for insert
  with check (auth.uid() = rated_by);
