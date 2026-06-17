-- Add outreach counters to leads table
alter table leads
  add column if not exists call_count  int not null default 0,
  add column if not exists message_count int not null default 0,
  add column if not exists email_count int not null default 0;
