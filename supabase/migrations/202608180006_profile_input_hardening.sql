-- Bound auth metadata before it reaches the application profile table.
-- Existing values are normalized before the length constraints are added so
-- this upgrade never deletes a profile or rejects the migration for legacy
-- provider metadata.

update public.profiles
set full_name = pg_catalog.left(
      coalesce(nullif(pg_catalog.btrim(full_name), ''), 'POT Volunteer'),
      160
    ),
    email = pg_catalog.left(coalesce(email, ''), 320)
where full_name is null
   or email is null
   or pg_catalog.btrim(full_name) = ''
   or pg_catalog.btrim(full_name) <> full_name
   or pg_catalog.char_length(full_name) > 160
   or pg_catalog.char_length(email) > 320;

alter table public.profiles drop constraint if exists profiles_full_name_length;
alter table public.profiles add constraint profiles_full_name_length
  check (pg_catalog.char_length(full_name) between 1 and 160);

alter table public.profiles drop constraint if exists profiles_email_length;
alter table public.profiles add constraint profiles_email_length
  check (pg_catalog.char_length(email) <= 320);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text;
  normalized_email text;
begin
  normalized_name := pg_catalog.left(
    coalesce(
      nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
      nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data->>'name', '')), ''),
      'POT Volunteer'
    ),
    160
  );
  normalized_email := pg_catalog.left(coalesce(new.email, ''), 320);

  insert into public.profiles (id, full_name, email)
  values (new.id, normalized_name, normalized_email)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

