-- Forward release-migration tests.
--
-- This file creates rollback-only fixtures for release-migration behavior.
-- It supports isolated local copies and the approved Supabase test gate; all
-- temporary catalog and data changes roll back before it exits.
begin;
set local search_path = public, extensions;
select plan(42);

-- A local actual-data restore may already contain these original legacy source
-- tables. Move them into a private, transaction-scoped schema before making
-- synthetic public replacements; the final ROLLBACK restores their names,
-- definitions, privileges, and rows without deleting source data.
create schema release_migration_safety_fixture;
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'event_volunteers', 'check_in_sessions', 'attendance_logs'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format(
        'alter table public.%I set schema release_migration_safety_fixture',
        table_name
      );
    end if;
  end loop;
end;
$$;

select has_table(
  'public',
  'release_migration_issues',
  'release migration records unresolved rows'
);
select has_function(
  'public',
  'run_release_legacy_backfill',
  '{}',
  'legacy backfill is available for an owner rerun after mapping repair'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.release_migration_issues'::regclass)
  and (select relforcerowsecurity from pg_class where oid = 'public.release_migration_issues'::regclass),
  'migration issue records are forced behind RLS'
);
select ok(
  not has_table_privilege('anon', 'public.release_migration_issues', 'SELECT')
    and not has_table_privilege('authenticated', 'public.release_migration_issues', 'SELECT')
    and not has_table_privilege('service_role', 'public.release_migration_issues', 'SELECT'),
  'migration issue records are not exposed through browser or service roles'
);
select ok(
  not has_function_privilege('anon', 'public.run_release_legacy_backfill()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.run_release_legacy_backfill()', 'EXECUTE')
    and not has_function_privilege('service_role', 'public.run_release_legacy_backfill()', 'EXECUTE'),
  'legacy backfill has no API execution grant'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.volunteer_hour_adjustments'::regclass
      and conname = 'volunteer_hour_adjustments_hours_delta_nonzero'
      and contype = 'c'
      and not convalidated
      and pg_get_constraintdef(oid) = 'CHECK ((hours_delta <> (0)::numeric)) NOT VALID'
  ),
  'existing casted-zero adjustment check keeps its definition and NOT VALID state'
);

-- Simulate the legacy profiles table after the additive foundation migration.
alter table public.profiles add column if not exists role text;
select has_column('public', 'profiles', 'role', 'legacy role data remains available for backfill/audit');

-- Some restored legacy schemas constrain role to volunteer/staff even though
-- the backfill must also recognize historical admin values. Relax only this
-- fixture constraint inside the test transaction; ROLLBACK restores it.
alter table public.profiles
  drop constraint if exists profiles_role_check;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '81000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'admin-fixture@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '81000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'staff-fixture@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '81000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'staff-looking-volunteer@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

-- The migration's fresh-table definition also has an inline CHECK. Remove that
-- duplicate only inside this test transaction so the insert exercises the
-- preserved named NOT VALID constraint specifically; the final rollback puts
-- both constraints back.
alter table public.volunteer_hour_adjustments
  drop constraint if exists volunteer_hour_adjustments_hours_delta_check;

select throws_ok(
  $$insert into public.volunteer_hour_adjustments (user_id, hours_delta, reason)
    values ('81000000-0000-0000-0000-000000000003', 0, 'zero-delta regression fixture')$$,
  '23514',
  'new row for relation "volunteer_hour_adjustments" violates check constraint "volunteer_hour_adjustments_hours_delta_nonzero"',
  'existing NOT VALID adjustment check still rejects new zero-hour rows'
);

update public.profiles
set role = case id
  when '81000000-0000-0000-0000-000000000001'::uuid then 'admin'
  when '81000000-0000-0000-0000-000000000002'::uuid then 'staff'
  else 'volunteer'
end
where id in (
  '81000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000002',
  '81000000-0000-0000-0000-000000000003'
);

-- Existing configured event content must not be replaced by a legacy title.
-- Mapped legacy events are owner-reviewed rows; missing rows stay unresolved.
insert into public.events (id, slug, title, status, publication_state, branch)
values
  ('release-existing-event', 'release-existing-event', 'Owner configured event', 'upcoming', 'published', 'ca'),
  ('release-legacy-event', 'release-legacy-event', 'Owner-reviewed legacy event', 'completed', 'unpublished', 'ca'),
  ('release-log-event', 'release-log-event', 'Owner-reviewed log event', 'completed', 'unpublished', 'ca');

-- Reproduce the old schema's tables. They have no browser privileges after the
-- foundation's legacy-table revoke; the release backfill runs as the owner.
create table public.event_volunteers (
  id uuid primary key,
  user_id uuid not null,
  event_id text not null,
  event_title text not null,
  status text default 'registered',
  hours numeric default 0,
  checked_in_at timestamptz,
  created_at timestamptz default timezone('utc', now()) not null
);
create table public.check_in_sessions (
  id uuid primary key,
  user_id uuid not null,
  event_id text not null,
  check_in_time timestamptz default timezone('utc', now()) not null,
  check_out_time timestamptz,
  hours_logged numeric default 0 not null,
  created_at timestamptz default timezone('utc', now()) not null
);
create table public.attendance_logs (
  id uuid primary key,
  volunteer_id uuid not null,
  event_id text not null,
  checked_in_at timestamptz default timezone('utc', now()) not null,
  checked_out_at timestamptz
);
revoke all on table public.event_volunteers, public.check_in_sessions, public.attendance_logs from public, anon, authenticated, service_role;

insert into public.event_volunteers (
  id, user_id, event_id, event_title, status, hours, checked_in_at, created_at
) values
  (
    '82000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000003',
    'release-existing-event', 'Legacy title must not replace configured content',
    'attended', 2.50, '2026-08-01 10:00+00', '2026-08-01 09:00+00'
  ),
  (
    '82000000-0000-0000-0000-000000000002',
    '81000000-0000-0000-0000-000000000003',
    'release-legacy-event', 'Legacy STEM night',
    'registered', 0, null, '2026-08-02 09:00+00'
  ),
  (
    '82000000-0000-0000-0000-000000000003',
    '81000000-0000-0000-0000-000000000003',
    'bad event id', 'Invalid event identifier',
    'registered', 0, null, '2026-08-03 09:00+00'
  ),
  (
    '82000000-0000-0000-0000-000000000004',
    '81000000-0000-0000-0000-000000000003',
    'release-unmapped-event', 'Needs owner mapping',
    'registered', 0, null, '2026-08-04 09:00+00'
  );

insert into public.check_in_sessions (
  id, user_id, event_id, check_in_time, check_out_time, hours_logged, created_at
) values
  (
    '83000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000003',
    'release-legacy-event', '2026-08-02 10:00+00', '2026-08-02 12:00+00', 2,
    '2026-08-02 10:00+00'
  ),
  (
    '83000000-0000-0000-0000-000000000002',
    '81000000-0000-0000-0000-000000000003',
    'release-legacy-event', '2026-08-03 10:00+00', null, 0,
    '2026-08-03 10:00+00'
  ),
  (
    '83000000-0000-0000-0000-000000000003',
    '81000000-0000-0000-0000-000000000003',
    'release-legacy-event', '2026-08-03 11:00+00', null, 0,
    '2026-08-03 11:00+00'
  );

insert into public.attendance_logs (
  id, volunteer_id, event_id, checked_in_at, checked_out_at
) values (
  '84000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000003',
  'release-log-event', '2026-08-04 10:00+00', '2026-08-04 11:00+00'
);

select public.run_release_legacy_backfill();

select is(
  (select count(*) from public.staff_members where user_id in (
    '81000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000002',
    '81000000-0000-0000-0000-000000000003'
  )),
  2::bigint,
  'admin and staff roles map to staff_members by existing auth UUID only'
);
select ok(
  exists (select 1 from public.staff_members where user_id = '81000000-0000-0000-0000-000000000001')
    and exists (select 1 from public.staff_members where user_id = '81000000-0000-0000-0000-000000000002')
    and not exists (select 1 from public.staff_members where user_id = '81000000-0000-0000-0000-000000000003'),
  'email text does not grant or deny staff authority'
);
select is(
  (select title from public.events where id = 'release-existing-event'),
  'Owner configured event',
  'existing configured event title is retained'
);
select is(
  (select publication_state from public.events where id = 'release-existing-event'),
  'published',
  'existing configured event publication state is retained'
);
select ok(
  exists (
    select 1 from public.events
    where id = 'release-legacy-event'
      and title = 'Owner-reviewed legacy event'
      and publication_state = 'unpublished'
      and volunteer_registration_state = 'closed'
  ),
  'owner-reviewed legacy event remains unpublished and closed'
);
select ok(
  not exists (select 1 from public.events where id = 'release-unmapped-event'),
  'missing legacy event is not synthesized by the migration'
);
select is(
  (select count(*) from public.volunteer_registrations where id in (
    '82000000-0000-0000-0000-000000000001',
    '82000000-0000-0000-0000-000000000002'
  )),
  2::bigint,
  'valid legacy registrations are copied with their original IDs'
);
select is(
  (select status from public.volunteer_registrations where id = '82000000-0000-0000-0000-000000000001'),
  'attended',
  'registration status is preserved'
);
select is(
  (select hours from public.volunteer_registrations where id = '82000000-0000-0000-0000-000000000001'),
  2.50::numeric,
  'registration hours are preserved'
);
select is(
  (select checked_in_at from public.volunteer_registrations where id = '82000000-0000-0000-0000-000000000001'),
  '2026-08-01 10:00+00'::timestamptz,
  'present legacy check-in timestamps are preserved'
);
select is(
  (select count(*) from public.attendance_sessions where id in (
    '83000000-0000-0000-0000-000000000001',
    '83000000-0000-0000-0000-000000000002',
    '84000000-0000-0000-0000-000000000001'
  )),
  3::bigint,
  'completed and first active check-ins are copied with original IDs'
);
select is(
  (select hours_logged from public.attendance_sessions where id = '83000000-0000-0000-0000-000000000001'),
  2::numeric,
  'check-in session hours are preserved'
);
select is(
  (select check_out_at from public.attendance_sessions where id = '84000000-0000-0000-0000-000000000001'),
  '2026-08-04 11:00+00'::timestamptz,
  'attendance log checkout time is preserved'
);
select ok(
  exists (
    select 1 from public.release_migration_issues
    where source_table = 'check_in_sessions'
      and source_id = '83000000-0000-0000-0000-000000000003'
      and issue_code = 'active_session_conflict'
  ),
  'duplicate active check-ins are explicitly recorded'
);
select ok(
  exists (
    select 1 from public.release_migration_issues
    where source_table = 'event_volunteers'
      and source_id = 'bad event id'
      and issue_code = 'invalid_event_id'
  ),
  'unresolved event identifiers are explicitly recorded'
);
select ok(
  exists (
    select 1 from public.release_migration_issues
    where source_table = 'event_volunteers'
      and source_id = 'release-unmapped-event'
      and issue_code = 'event_not_found'
      and resolved_at is null
  ),
  'owner mapping gaps remain unresolved until an event row exists'
);
select is(
  (select count(*) from public.event_volunteers),
  4::bigint,
  'legacy registration rows remain untouched for rollback/review'
);
select is(
  (select count(*) from public.check_in_sessions),
  3::bigint,
  'legacy check-in rows remain untouched for rollback/review'
);
select is(
  (select count(*) from public.attendance_logs),
  1::bigint,
  'legacy attendance log rows remain untouched for rollback/review'
);
select has_table('public', 'event_volunteers', 'legacy registration table is retained');
select has_table('public', 'check_in_sessions', 'legacy session table is retained');
select has_table('public', 'attendance_logs', 'legacy attendance table is retained');

-- Production may lack this optional column. Missing values stay NULL; the
-- migration must never substitute created_at or the current time.
alter table public.event_volunteers drop column checked_in_at;
insert into public.events (id, slug, title, status, publication_state, branch)
values (
  'release-optional-time-event',
  'release-optional-time-event',
  'Owner-reviewed optional timestamp event',
  'completed',
  'unpublished',
  'ca'
);
insert into public.event_volunteers (
  id, user_id, event_id, event_title, status, hours, created_at
) values (
  '82000000-0000-0000-0000-000000000005',
  '81000000-0000-0000-0000-000000000003',
  'release-optional-time-event',
  'Legacy row without an optional timestamp',
  'registered',
  1.75,
  '2026-08-05 09:30+00'
);

select lives_ok(
  'select public.run_release_legacy_backfill()',
  'backfill accepts the production event_volunteers shape without checked_in_at'
);
select is(
  (
    select jsonb_build_object(
      'id', id::text,
      'user_id', user_id::text,
      'status', status::text,
      'hours', hours,
      'created_at', created_at
    )
    from public.volunteer_registrations
    where id = '82000000-0000-0000-0000-000000000005'
  ),
  jsonb_build_object(
    'id', '82000000-0000-0000-0000-000000000005',
    'user_id', '81000000-0000-0000-0000-000000000003',
    'status', 'registered',
    'hours', 1.75::numeric,
    'created_at', '2026-08-05 09:30+00'::timestamptz
  ),
  'missing-column registration preserves its id, user, status, hours, and creation time'
);
select is(
  (select checked_in_at from public.volunteer_registrations where id = '82000000-0000-0000-0000-000000000005'),
  null::timestamptz,
  'missing legacy checked_in_at remains NULL'
);
select is(
  (
    select jsonb_build_object(
      'id', id::text,
      'user_id', user_id::text,
      'event_id', event_id,
      'event_title', event_title,
      'status', status::text,
      'hours', hours,
      'created_at', created_at
    )
    from public.event_volunteers
    where id = '82000000-0000-0000-0000-000000000005'
  ),
  jsonb_build_object(
    'id', '82000000-0000-0000-0000-000000000005',
    'user_id', '81000000-0000-0000-0000-000000000003',
    'event_id', 'release-optional-time-event',
    'event_title', 'Legacy row without an optional timestamp',
    'status', 'registered',
    'hours', 1.75::numeric,
    'created_at', '2026-08-05 09:30+00'::timestamptz
  ),
  'source row values remain unchanged'
);
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'event_volunteers'
      and column_name = 'checked_in_at'
  ),
  'backfill leaves the source table without the optional timestamp column'
);
select lives_ok(
  'select public.run_release_legacy_backfill()',
  'backfill can be rerun with the optional timestamp column absent'
);
select is(
  (select count(*) from public.volunteer_registrations where id = '82000000-0000-0000-0000-000000000005'),
  1::bigint,
  'rerun does not duplicate the missing-column registration'
);
select ok(
  not has_function_privilege('anon', 'public.run_release_legacy_backfill()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.run_release_legacy_backfill()', 'EXECUTE')
    and not has_function_privilege('service_role', 'public.run_release_legacy_backfill()', 'EXECUTE'),
  'running and rerunning the backfill does not create an API execution grant'
);

-- A rerun must not duplicate rows or replace configured content.
insert into public.events (id, slug, title, status, publication_state, branch)
values ('release-unmapped-event', 'release-unmapped-event', 'Mapped after review', 'completed', 'unpublished', 'ca');
select public.run_release_legacy_backfill();
select is(
  (select count(*) from public.volunteer_registrations where id in (
    '82000000-0000-0000-0000-000000000001',
    '82000000-0000-0000-0000-000000000002',
    '82000000-0000-0000-0000-000000000004',
    '82000000-0000-0000-0000-000000000005'
  )),
  4::bigint,
  'backfill imports the four synthetic owner-mapped registrations without duplicates'
);
select is(
  (select count(*) from public.attendance_sessions),
  3::bigint,
  'backfill is idempotent for attendance'
);
select ok(
  exists (
    select 1 from public.release_migration_issues
    where source_table = 'event_volunteers'
      and source_id = 'release-unmapped-event'
      and issue_code = 'event_not_found'
      and resolved_at is not null
  ),
  'resolved event mapping is retained as audit history'
);
select ok(
  position('auth.users where email' in lower(pg_get_functiondef('public.run_release_legacy_backfill()'::regprocedure))) = 0,
  'backfill function has no email authorization predicate'
);

select * from finish();
rollback;
