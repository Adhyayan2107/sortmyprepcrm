-- ============================================================
-- sortmyprepCRM — Phase 5: Script Lead Usage / Grading
-- Run in Supabase SQL Editor AFTER phase4_setup.sql
-- ============================================================

-- Tracks which script is assigned to each lead for grading
create table if not exists public.script_lead_usage (
  id           uuid primary key default gen_random_uuid(),
  script_id    uuid not null references public.scripts(id) on delete cascade,
  lead_id      uuid not null references public.leads(id) on delete cascade,
  assigned_by  uuid references public.users(id),
  assigned_at  timestamptz default now(),
  -- One active script per lead at a time; upsert on lead_id to change assignment
  constraint script_lead_usage_lead_unique unique (lead_id)
);

alter table public.script_lead_usage enable row level security;

create policy "Authenticated users can manage script_lead_usage"
  on public.script_lead_usage for all
  using  (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
