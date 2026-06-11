-- ============================================================
-- Script Document Upload — run in Supabase SQL Editor
-- ============================================================

-- 1. Add document columns to scripts table
alter table public.scripts
  add column if not exists document_url  text,
  add column if not exists document_name text;

-- 2. Create storage bucket for script documents
insert into storage.buckets (id, name, public)
values ('script-docs', 'script-docs', true)
on conflict (id) do nothing;

-- 3. Storage policies
create policy "Authenticated users can upload script docs"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'script-docs');

create policy "Anyone can read script docs"
  on storage.objects for select
  using (bucket_id = 'script-docs');

create policy "Authenticated users can update script docs"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'script-docs');

create policy "Authenticated users can delete script docs"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'script-docs');
