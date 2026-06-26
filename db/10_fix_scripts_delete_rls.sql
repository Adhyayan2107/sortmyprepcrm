-- ============================================================
-- Run this ONCE in Supabase SQL Editor
-- Fixes: missing DELETE policies on scripts and script_questions
-- Without these, deletes silently fail (RLS blocks with no error)
-- ============================================================

-- 1. Allow admins to delete scripts
create policy "Admins can delete scripts"
  on public.scripts for delete
  using (public.is_admin());

-- 2. Allow authenticated users to delete script questions
--    (questions have no separate ownership — any authed user can manage them)
create policy "Authenticated users can delete script questions"
  on public.script_questions for delete
  using (auth.role() = 'authenticated');
