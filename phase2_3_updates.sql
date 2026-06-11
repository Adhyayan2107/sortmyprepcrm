-- ============================================================
-- sortmyprepCRM — Phase 2 & 3 SQL Updates
-- Run in Supabase SQL Editor AFTER supabase_setup.sql
-- ============================================================

-- 1. TIGHTEN RLS ON LEADS FOR ROLE-BASED ACCESS
-- Drop Phase 1 open policies
drop policy if exists "Authenticated users can read leads" on public.leads;
drop policy if exists "Authenticated users can insert leads" on public.leads;
drop policy if exists "Authenticated users can update leads" on public.leads;

-- Admin sees all leads
create policy "Admins can read all leads"
  on public.leads for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Reps see leads assigned to them OR in their countries
create policy "Reps can read own leads"
  on public.leads for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'rep'
        and (
          leads.assigned_to = auth.uid()
          or leads.country = any(u.countries)
        )
    )
  );

-- All authenticated users can insert leads
create policy "Authenticated users can insert leads"
  on public.leads for insert
  with check (auth.role() = 'authenticated');

-- Admin can update all; rep can update their own
create policy "Admins can update all leads"
  on public.leads for update
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Reps can update own leads"
  on public.leads for update
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'rep'
        and (leads.assigned_to = auth.uid() or leads.country = any(u.countries))
    )
  );


-- 2. ALLOW ADMINS TO READ ALL USERS
drop policy if exists "Users can read own profile" on public.users;

create policy "Users can read own profile"
  on public.users for select
  using (
    auth.uid() = id
    or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Allow admins to update any user (for role/country assignment)
create policy "Admins can update any user"
  on public.users for update
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );


-- 3. SCRIPT RATINGS UNIQUE CONSTRAINT (for upsert in rateScript)
alter table public.script_ratings
  drop constraint if exists script_ratings_script_id_rated_by_key;

alter table public.script_ratings
  add constraint script_ratings_script_id_rated_by_key
  unique (script_id, rated_by);


-- 4. INCREMENT USAGE COUNT RPC
create or replace function increment_script_usage(script_id uuid)
returns void
language sql
as $$
  update public.scripts
  set usage_count = usage_count + 1
  where id = script_id;
$$;
