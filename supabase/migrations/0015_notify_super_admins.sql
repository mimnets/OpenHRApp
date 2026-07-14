-- ============================================================
-- OpenHR — Notify Super Admins RPC Function
-- Allows client code to create notifications for all SUPER_ADMIN
-- users without needing to bypass RLS on the profiles table.
-- ============================================================

-- Drop if exists (idempotent)
drop function if exists public.notify_super_admins(
  p_type text,
  p_title text,
  p_message text,
  p_priority text,
  p_reference_type text,
  p_reference_id uuid,
  p_action_url text
);

create or replace function public.notify_super_admins(
  p_type text,
  p_title text,
  p_message text default null,
  p_priority text default 'NORMAL',
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_action_url text default null
)
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sa record;
  new_id uuid;
begin
  for sa in
    select id from public.profiles where role = 'SUPER_ADMIN'
  loop
    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      is_read,
      priority,
      reference_type,
      reference_id,
      action_url
    ) values (
      sa.id,
      p_type,
      p_title,
      p_message,
      false,
      p_priority,
      p_reference_type,
      p_reference_id,
      p_action_url
    ) returning id into new_id;

    return next new_id;
  end loop;

  return;
end
$$;
