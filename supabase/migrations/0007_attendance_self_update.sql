-- ============================================================
-- OpenHR — Allow employees to update their own attendance rows
-- 0007_attendance_self_update.sql
--
-- Bug: original attendance_update policy (0002) only allowed
-- ADMIN/HR/MANAGER roles to update attendance. Regular employees
-- could not write check_out to their own row, so the check-out
-- punch silently failed under RLS and the UI reverted back to
-- "Check Out".
-- ============================================================

drop policy if exists "attendance_update" on public.attendance;

create policy "attendance_update" on public.attendance for update using (
  public.is_super_admin()
  or (
    organization_id = public.auth_org_id()
    and (
      public.auth_role() in ('ADMIN','HR','MANAGER')
      or employee_id = auth.uid()
    )
  )
);
