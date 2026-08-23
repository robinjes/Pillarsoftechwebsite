-- Task 06 profile-input hardening contract tests.
begin;
select plan(8);

select has_function(
  'public', 'handle_new_user', '{}',
  'auth profile trigger function exists'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_full_name_length'
  ),
  'profile full_name length constraint exists'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_email_length'
  ),
  'profile email length constraint exists'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_proc
    where oid = 'public.handle_new_user()'::regprocedure
      and prosecdef
      and proconfig @> array['search_path=""']
  ),
  'profile trigger remains database-owned with an empty search path'
);

do $$
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '60000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    -- auth.users caps email at 255 characters; the profile contract allows
    -- the wider 320-character provider boundary without truncating valid auth
    -- values.
    'authenticated', 'authenticated', repeat('e', 255), '',
    now(), '{}'::jsonb,
    jsonb_build_object('full_name', repeat('N', 200)),
    now(), now()
  );
end;
$$;

select ok(
  exists (select 1 from public.profiles where id = '60000000-0000-0000-0000-000000000006'),
  'auth insert creates a bounded profile'
);
select is(
  (select pg_catalog.char_length(full_name) from public.profiles where id = '60000000-0000-0000-0000-000000000006'),
  160,
  'full_name metadata is truncated to 160 characters'
);
select is(
  (select pg_catalog.char_length(email) <= 320 from public.profiles where id = '60000000-0000-0000-0000-000000000006'),
  true,
  'email metadata stays within the 320-character boundary'
);
select is(
  (select full_name from public.profiles where id = '60000000-0000-0000-0000-000000000006'),
  repeat('N', 160),
  'profile name keeps the deterministic leading metadata'
);

select * from finish();
rollback;
