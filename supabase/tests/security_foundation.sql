-- Supabase CLI / pgTAP database contract tests.
-- Run after local services are available:
--   supabase db reset
--   supabase test db
-- The repository validation workflow runs these against a fresh local stack.

begin;
select plan(66);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'staff_members', 'staff membership exists');
select has_table('public', 'events', 'events exists');
select has_table('public', 'impact_metrics', 'impact metrics exists');
select has_table('public', 'registration_forms', 'validated forms exist');
select has_table('public', 'participant_registrations', 'private participant registrations exist');
select has_table('public', 'volunteer_registrations', 'volunteer registrations exist');
select has_table('public', 'attendance_sessions', 'attendance sessions exist');
select has_table('public', 'volunteer_hour_adjustments', 'hour audit exists');
select has_table('public', 'site_content', 'site content exists');
select has_table('public', 'media_assets', 'media metadata exists');
select has_table('public', 'contact_submissions', 'contact submissions exist');

select has_function('public', 'is_staff', '{}', 'is_staff has no arbitrary user id parameter');
select has_function('public', 'register_for_event', array['text'], 'volunteer registration RPC exists');
select has_function('public', 'cancel_event_registration', array['text'], 'volunteer cancellation RPC exists');
select has_function('public', 'staff_check_in_or_out', array['text', 'text'], 'atomic staff attendance RPC exists');
select has_function('public', 'staff_adjust_volunteer_hours', array['uuid', 'numeric', 'text'], 'staff adjustment RPC exists');
select ok(
  exists(
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'staff_members'
      and policyname = 'staff_members_select_staff'
  ),
  'staff can read membership for display only'
);
select ok(
  exists(
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'volunteer_registrations'
      and policyname = 'volunteer_registrations_select_own'
  ),
  'volunteers read only their own registrations'
);
select ok(
  exists(
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'attendance_sessions'
      and policyname = 'attendance_sessions_select_own_completed'
  ),
  'volunteers read only completed history'
);
select hasnt_column('public', 'profiles', 'role', 'profiles has no authoritative role column');

-- Synthetic identities are transaction-scoped test fixtures, not deployable
-- staff identities. The auth trigger creates both ordinary profiles.
do $$
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'staff-helper@example.test', '',
      now(), '{}'::jsonb, '{}'::jsonb, now(), now()
    ),
    (
      '20000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'owner-fixture@example.test', '',
      now(), '{}'::jsonb, '{}'::jsonb, now(), now()
    )
  on conflict (id) do nothing;

  -- Seed a pre-existing database-owned total. The migration must preserve it
  -- and must not recalculate it from historical adjustment rows.
  update public.profiles
  set total_hours = 2
  where id = '10000000-0000-0000-0000-000000000001';

  insert into public.staff_members (user_id)
  values ('20000000-0000-0000-0000-000000000002')
  on conflict (user_id) do nothing;

  insert into public.events (
    id, slug, title, publication_state, status,
    volunteer_registration_state, starts_at, ends_at
  ) values (
    'security-test-event', 'security-test-event', 'Security test event',
    'published', 'upcoming', 'open', now() + interval '1 day', now() + interval '2 days'
  )
  on conflict (id) do nothing;
end;
$$;

-- The email contains "staff", but membership is still the only authority.
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is(public.is_staff(), false, 'email text does not confer staff status');
select is(
  (select count(*) from public.profiles),
  1::bigint,
  'volunteer can read only own profile'
);
select is(
  (select total_hours from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  2::numeric,
  'existing profile total_hours is preserved'
);
select throws_ok(
  $$update public.profiles set full_name = 'forged' where id = '10000000-0000-0000-0000-000000000001'$$,
  '42501',
  'permission denied for table profiles',
  'volunteer cannot update profile identity'
);
select throws_ok(
  $$update public.profiles set total_hours = 99 where id = '10000000-0000-0000-0000-000000000001'$$,
  '42501',
  'permission denied for table profiles',
  'volunteer cannot update protected total_hours'
);
select throws_ok(
  $$insert into public.attendance_sessions(user_id, event_id) values ('10000000-0000-0000-0000-000000000001', 'security-test-event')$$,
  '42501',
  'permission denied for table attendance_sessions',
  'volunteer cannot insert attendance'
);
select throws_ok(
  $$insert into public.volunteer_hour_adjustments(user_id, adjusted_by, hours_delta) values ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1)$$,
  '42501',
  'permission denied for table volunteer_hour_adjustments',
  'volunteer cannot insert hour adjustments'
);
select throws_ok(
  $$select public.staff_check_in_or_out('not-a-code', 'security-test-event')$$,
  '42501',
  'staff authorization required',
  'non-staff cannot execute staff attendance RPC'
);
select lives_ok(
  $$select public.register_for_event('security-test-event')$$,
  'volunteer can register through the self-service RPC'
);
select is(
  (select count(*) from public.volunteer_registrations where user_id = '10000000-0000-0000-0000-000000000001'),
  1::bigint,
  'self-registration creates one row'
);
select lives_ok(
  $$select public.cancel_event_registration('security-test-event')$$,
  'volunteer can cancel an eligible registration through the RPC'
);
select is(
  (select count(*) from public.volunteer_registrations where user_id = '10000000-0000-0000-0000-000000000001'),
  0::bigint,
  'eligible cancellation removes only the own pending row'
);

-- Staff can read the protected roster and perform both halves of the atomic
-- attendance operation; no direct table mutation is granted to the client.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select is(public.is_staff(), true, 'staff membership grants staff status');
select is(
  jsonb_extract_path_text(
    public.staff_check_in_or_out(
      (select member_code from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
      'security-test-event'
    ),
    'action'
  ),
  'checkedIn',
  'staff check-in RPC creates an active session'
);
select is(
  (select count(*) from public.attendance_sessions where user_id = '10000000-0000-0000-0000-000000000001' and check_out_at is null),
  1::bigint,
  'check-in is recorded atomically'
);
-- Age the fixture as the database owner so checkout exercises a meaningful
-- hour calculation without granting a client direct attendance updates.
reset role;
update public.attendance_sessions
set check_in_at = clock_timestamp() - interval '1 hour'
where user_id = '10000000-0000-0000-0000-000000000001' and check_out_at is null;
update public.volunteer_registrations
set checked_in_at = clock_timestamp() - interval '1 hour'
where user_id = '10000000-0000-0000-0000-000000000001' and event_id = 'security-test-event';
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select is(
  jsonb_extract_path_text(
    public.staff_check_in_or_out(
      (select member_code from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
      'security-test-event'
    ),
    'action'
  ),
  'checkedOut',
  'staff check-out RPC closes the session'
);
select is(
  (select status from public.volunteer_registrations where user_id = '10000000-0000-0000-0000-000000000001' and event_id = 'security-test-event'),
  'attended',
  'check-out updates registration status'
);
select is(
  (select count(*) from public.volunteer_hour_adjustments where user_id = '10000000-0000-0000-0000-000000000001'),
  1::bigint,
  'check-out records one attendance adjustment'
);
select is(
  (select total_hours from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  3::numeric,
  'check-out increments the protected profile total atomically'
);
select throws_ok(
  $$select public.staff_check_in_or_out(
    (select member_code from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
    'security-test-event'
  )$$,
  '22023',
  'attendance for this event is already finalized',
  'completed attendance cannot be duplicated'
);
select lives_ok(
  $$select public.staff_adjust_volunteer_hours('10000000-0000-0000-0000-000000000001', 1, 'test correction')$$,
  'staff hour adjustment uses the staff RPC'
);
select is(
  (select count(*) from public.volunteer_hour_adjustments where user_id = '10000000-0000-0000-0000-000000000001'),
  2::bigint,
  'staff adjustment is auditable'
);
select is(
  (select total_hours from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  4::numeric,
  'manual staff adjustment increments the protected profile total'
);
select throws_ok(
  $$select public.staff_adjust_volunteer_hours('10000000-0000-0000-0000-000000000001', -5, 'would underflow')$$,
  '22023',
  'hour adjustment would make total hours negative',
  'negative staff adjustment cannot underflow total_hours'
);
select is(
  (select total_hours from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  4::numeric,
  'rejected negative adjustment leaves total_hours unchanged'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*) from public.attendance_sessions where user_id = '10000000-0000-0000-0000-000000000001' and check_out_at is not null),
  1::bigint,
  'volunteer can read own completed history'
);
select throws_ok(
  $$insert into public.staff_members(user_id) values ('10000000-0000-0000-0000-000000000001')$$,
  '42501',
  'permission denied for table staff_members',
  'client cannot grant staff membership'
);
select throws_ok(
  $$update public.attendance_sessions set hours_logged = 99 where user_id = '10000000-0000-0000-0000-000000000001'$$,
  '42501',
  'permission denied for table attendance_sessions',
  'volunteer cannot update attendance hours'
);
select throws_ok(
  $$update public.volunteer_hour_adjustments set hours_delta = 99 where user_id = '10000000-0000-0000-0000-000000000001'$$,
  '42501',
  'permission denied for table volunteer_hour_adjustments',
  'volunteer cannot update hour audit rows'
);

-- Anonymous callers cannot read private membership or registration data.
set local role anon;
select ok(
  not has_table_privilege('anon', 'public.staff_members', 'SELECT'),
  'anonymous role has no staff membership read privilege'
);
select ok(not has_column_privilege('anon', 'public.events', 'created_by', 'SELECT'), 'public events grant excludes audit owner');
select ok(not has_column_privilege('anon', 'public.events', 'participant_capacity', 'SELECT'), 'public events grant excludes participant capacity');
select ok(not has_column_privilege('anon', 'public.events', 'volunteer_capacity', 'SELECT'), 'public events grant excludes volunteer capacity');
select ok(not has_column_privilege('anon', 'public.events', 'outcomes', 'SELECT'), 'public events grant excludes private outcomes');
select ok(has_column_privilege('anon', 'public.events', 'publication_state', 'SELECT'), 'public events expose publication state only for the bounded published-row predicate');
select ok(not has_column_privilege('anon', 'public.media_assets', 'metadata', 'SELECT'), 'public media grant excludes internal metadata');
select ok(not has_column_privilege('anon', 'public.media_assets', 'storage_path', 'SELECT'), 'public media grant excludes storage path');
select ok(not has_column_privilege('anon', 'public.media_assets', 'original_filename', 'SELECT'), 'public media grant excludes original filename');
select ok(not has_column_privilege('anon', 'public.media_assets', 'sha256', 'SELECT'), 'public media grant excludes upload hash');
select ok(has_column_privilege('authenticated', 'public.profiles', 'total_hours', 'SELECT'), 'authenticated staff/volunteers may read protected total_hours through RLS');
select throws_ok(
  $$insert into public.participant_registrations(event_id, submitted_data) values ('not-an-event', '{}'::jsonb)$$,
  '42501',
  'permission denied for table participant_registrations',
  'anonymous participant insert is denied'
);
select ok(
  not has_function_privilege('anon', 'public.staff_check_in_or_out(text,text)', 'EXECUTE'),
  'anonymous role cannot execute staff RPC'
);
select ok(
  not has_function_privilege('anon', 'public.is_staff()', 'EXECUTE'),
  'anonymous role cannot execute the staff helper'
);
select ok(
  has_function_privilege('authenticated', 'public.register_for_event(text)', 'EXECUTE'),
  'authenticated role can execute only the approved registration RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.is_staff()', 'EXECUTE'),
  'authenticated role can execute the membership helper'
);
select * from finish();
rollback;
