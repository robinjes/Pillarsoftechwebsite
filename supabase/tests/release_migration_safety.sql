-- Forward release-migration tests.
--
-- This file creates a transaction-scoped copy of the original volunteer and
-- attendance tables. It never targets a hosted project and rolls all rows
-- back before the test exits.
begin;
select plan(31);

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

-- Simulate the legacy profiles table after the additive foundation migration.
alter table public.profiles add column role text;
select has_column('public', 'profiles', 'role', 'legacy role data remains available for backfill/audit');

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

-- A rerun must not duplicate rows or replace configured content.
insert into public.events (id, slug, title, status, publication_state, branch)
values ('release-unmapped-event', 'release-unmapped-event', 'Mapped after review', 'completed', 'unpublished', 'ca');
select public.run_release_legacy_backfill();
select is(
  (select count(*) from public.volunteer_registrations),
  3::bigint,
  'backfill imports a newly owner-mapped registration without duplicates'
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
