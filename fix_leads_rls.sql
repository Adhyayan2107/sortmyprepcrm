-- ============================================================
-- Fix: simplify RLS on leads table
-- Replaces the role-split policies (which cause insert failures)
-- with simple "authenticated user = full access" policies.
-- Access control (admin vs rep) is enforced in the app layer.
-- ============================================================

-- Drop all existing leads policies (covers any naming variation)
drop policy if exists "Admins can read all leads"         on public.leads;
drop policy if exists "Reps can read own leads"           on public.leads;
drop policy if exists "Authenticated users can insert leads" on public.leads;
drop policy if exists "Admins can update all leads"       on public.leads;
drop policy if exists "Reps can update own leads"         on public.leads;
drop policy if exists "Authenticated users can read leads" on public.leads;
drop policy if exists "Authenticated users can update leads" on public.leads;
drop policy if exists "Authenticated users can delete leads" on public.leads;
drop policy if exists "Enable insert for authenticated users only" on public.leads;
drop policy if exists "Enable read access for all users"  on public.leads;

-- Clean, simple policies: any signed-in team member has full access
create policy "Authenticated read leads"
  on public.leads for select
  using (auth.role() = 'authenticated');

create policy "Authenticated insert leads"
  on public.leads for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update leads"
  on public.leads for update
  using  (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated delete leads"
  on public.leads for delete
  using (auth.role() = 'authenticated');
