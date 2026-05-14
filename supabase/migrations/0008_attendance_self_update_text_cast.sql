-- ============================================================
-- OpenHR — Fix attendance_update RLS: employee_id is text, auth.uid() is uuid
-- 0008_attendance_self_update_text_cast.sql
--
-- Migration 0007 used `employee_id = auth.uid()` but employee_id is `text`
-- (denormalized PB-style ID string) and auth.uid() is `uuid`. Postgres
-- either errors on the comparison or evaluates to false, so the self-update
-- branch never matches. Cast auth.uid() to text to fix.
-- ============================================================

drop policy if exists "attendance_update" on public.attendance;

create policy "attendance_update" on public.attendance for update using (
  public.is_super_admin()
  or (
    organization_id = public.auth_org_id()
    and (
      public.auth_role() in ('ADMIN','HR','MANAGER')
      or employee_id = auth.uid()::text
    )
  )
);
