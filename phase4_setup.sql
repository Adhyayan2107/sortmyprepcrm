-- ============================================================
-- sortmyprepCRM — Phase 4 SQL Setup
-- Run in Supabase SQL Editor AFTER phase2_3_updates.sql
-- ============================================================

alter table public.leads
  add column if not exists intel_fetched_at timestamptz,
  add column if not exists intel_annotation text;
