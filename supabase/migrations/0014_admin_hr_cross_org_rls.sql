-- Allow ADMIN and HR roles to see attendance/leaves across all organizations,
-- not just their own. Previously only SUPER_ADMIN had cross-org visibility.

-- DROP and recreate attendance_select policy
drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select" on public.attendance for select using (
  public.is_super_admin()
  or public.auth_role() in ('ADMIN', 'HR')
  or organization_id = public.auth_org_id()
);

-- DROP and recreate leaves_select policy
drop policy if exists "leaves_select" on public.leaves;
create policy "leaves_select" on public.leaves for select using (
  public.is_super_admin()
  or public.auth_role() in ('ADMIN', 'HR')
  or organization_id = public.auth_org_id()
);
