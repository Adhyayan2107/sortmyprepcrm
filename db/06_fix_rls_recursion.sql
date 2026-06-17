-- ============================================================
-- Fix: Infinite recursion in RLS policy for public.users
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create a SECURITY DEFINER function that checks admin role
--    bypassing RLS entirely — breaks the self-referential loop
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;


-- 2. Fix the users table policy (this was the direct cause of recursion)
drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Admins can update any user" on public.users;

create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id or public.is_admin());

create policy "Admins can update any user"
  on public.users for update
  using (public.is_admin());


-- 3. Fix leads policies (they queried public.users directly, triggering the recursive policy)
drop policy if exists "Admins can read all leads" on public.leads;
drop policy if exists "Reps can read own leads" on public.leads;
drop policy if exists "Admins can update all leads" on public.leads;
drop policy if exists "Reps can update own leads" on public.leads;

create policy "Admins can read all leads"
  on public.leads for select
  using (public.is_admin());

create policy "Reps can read own leads"
  on public.leads for select
  using (
    not public.is_admin()
    and auth.role() = 'authenticated'
    and (
      leads.assigned_to = auth.uid()
      or leads.country = any(
        select unnest(countries) from public.users where id = auth.uid()
      )
    )
  );

create policy "Admins can update all leads"
  on public.leads for update
  using (public.is_admin());

create policy "Reps can update own leads"
  on public.leads for update
  using (
    not public.is_admin()
    and (
      leads.assigned_to = auth.uid()
      or leads.country = any(
        select unnest(countries) from public.users where id = auth.uid()
      )
    )
  );


-- 4. Fix scripts update policy (same pattern)
drop policy if exists "Creator or admin can update scripts" on public.scripts;

create policy "Creator or admin can update scripts"
  on public.scripts for update
  using (auth.uid() = created_by or public.is_admin());
