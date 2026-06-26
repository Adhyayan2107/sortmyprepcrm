-- db/11_lead_contacts.sql
-- Run once in Supabase SQL Editor

create table lead_contacts (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  name        text,
  designation text,
  phone       text,
  email       text,
  linkedin    text,
  created_at  timestamptz not null default now()
);

-- Prevents same email being added twice to the same lead
create unique index lead_contacts_lead_email_uidx
  on lead_contacts(lead_id, email)
  where email is not null and email <> '';

alter table lead_contacts enable row level security;

create policy "authenticated read"
  on lead_contacts for select
  using (auth.role() = 'authenticated');

create policy "authenticated insert"
  on lead_contacts for insert
  with check (auth.role() = 'authenticated');

create policy "authenticated delete"
  on lead_contacts for delete
  using (auth.role() = 'authenticated');
