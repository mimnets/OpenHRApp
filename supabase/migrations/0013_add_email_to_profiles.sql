-- ============================================================
-- OpenHR — Add email column to profiles
-- Email is stored in auth.users but not in profiles, so admin
-- views of employee profiles show an empty work email.
-- 0013_add_email_to_profiles.sql
-- ============================================================

-- Add the column (nullable initially so it works on existing rows)
alter table public.profiles add column if not exists email text;

-- Backfill existing profiles from auth.users
update public.profiles p
   set email = u.email
  from auth.users u
 where p.id = u.id
   and p.email is null;

-- Update the handle_new_user trigger to capture email on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Sync email changes from auth.users to profiles
create or replace function public.sync_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row execute function public.sync_email_from_auth();
