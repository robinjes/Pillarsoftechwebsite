begin;
select plan(30);

select has_function('public', 'register_for_event', array['text'], 'bounded volunteer registration RPC exists');
select has_function('public', 'cancel_event_registration', array['text'], 'bounded volunteer cancellation RPC exists');
select has_function('public', 'staff_check_in_or_out', array['text', 'text'], 'bounded staff attendance RPC exists');
select has_function('public', 'staff_adjust_volunteer_hours', array['uuid', 'numeric', 'text'], 'bounded staff hour RPC exists');
select ok(
  exists(
    select 1 from pg_proc
    where oid = 'public.staff_adjust_volunteer_hours(uuid,numeric,text)'::regprocedure
      and proconfig @> array['search_path=""']
  ),
  'staff adjustment keeps an empty security-definer search path'
);

do $$
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      '30000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'staff-helper-task05@example.test', '',
      now(), '{}'::jsonb, '{}'::jsonb, now(), now()
    ),
    (
      '40000000-0000-0000-0000-000000000004',
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'volunteer-task05@example.test', '',
      now(), '{}'::jsonb, '{}'::jsonb, now(), now()
    )
  on conflict (id) do nothing;

  update public.profiles set total_hours = 0
  where id = '40000000-0000-0000-0000-000000000004';

  insert into public.staff_members (user_id)
  values ('30000000-0000-0000-0000-000000000003')
  on conflict (user_id) do nothing;

  insert into public.events (
    id, slug, title, publication_state, status,
    volunteer_registration_state, starts_at, ends_at
  ) values (
    'task05-event', 'task05-event', 'Task 05 event', 'published', 'upcoming',
    'open', now() + interval '1 day', now() + interval '2 days'
  ) on conflict (id) do nothing;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', true);
select is(public.is_staff(), false, 'ordinary volunteer is not staff');
select lives_ok($$select public.register_for_event('task05-event')$$, 'volunteer can register through the bounded RPC');
select throws_ok(
  $$select public.register_for_event(repeat('x', 65))$$,
  '22023',
  'invalid event identifier',
  'registration rejects an overlong event identifier'
);
select lives_ok($$select public.cancel_event_registration('task05-event')$$, 'eligible volunteer cancellation succeeds');
select throws_ok(
  $$select public.cancel_event_registration('task05-event')$$,
  '22023',
  'registration is not eligible for cancellation',
  'cancellation does not report success when no row was deleted'
);
select is(
  (select count(*) from public.volunteer_registrations where user_id = '40000000-0000-0000-0000-000000000004'),
  0::bigint,
  'cancellation removed only the own pending row'
);
select throws_ok(
  $$select public.staff_check_in_or_out('bad', 'task05-event')$$,
  '42501',
  'staff authorization required',
  'an email containing staff does not grant staff access'
);

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);
select is(public.is_staff(), true, 'explicit staff membership grants staff status');
select throws_ok(
  $$select public.staff_adjust_volunteer_hours('40000000-0000-0000-0000-000000000004', 1, '  ')$$,
  '22023',
  'a meaningful adjustment reason is required',
  'blank hour adjustment reasons are rejected'
);
select lives_ok(
  $$select public.staff_adjust_volunteer_hours('40000000-0000-0000-0000-000000000004', 1, 'task five correction')$$,
  'staff can apply a nonzero audited adjustment'
);
select is(
  (select total_hours from public.profiles where id = '40000000-0000-0000-0000-000000000004'),
  1::numeric,
  'staff adjustment updates the database-owned total'
);
select lives_ok(
  $$select public.staff_check_in_or_out(
    (select member_code from public.profiles where id = '40000000-0000-0000-0000-000000000004'),
    'task05-event'
  )$$,
  'staff attendance uses the atomic RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.staff_check_in_or_out(text,text)', 'EXECUTE'),
  'authenticated staff route can call the attendance RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.staff_adjust_volunteer_hours(uuid,numeric,text)', 'EXECUTE'),
  'authenticated staff route can call the adjustment RPC'
);
select ok(
  not has_function_privilege('anon', 'public.staff_adjust_volunteer_hours(uuid,numeric,text)', 'EXECUTE'),
  'anonymous callers cannot call the adjustment RPC'
);
select ok(
  not has_column_privilege('authenticated', 'public.attendance_sessions', 'hours_logged', 'UPDATE'),
  'ordinary clients cannot update attendance hours'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'total_hours', 'UPDATE'),
  'ordinary clients cannot update total hours'
);
select hasnt_column('public', 'profiles', 'role', 'profiles has no client-controlled role column');
select ok(
  not has_table_privilege('authenticated', 'public.staff_members', 'INSERT'),
  'ordinary clients cannot grant staff membership'
);
select ok(
  not has_column_privilege('authenticated', 'public.volunteer_registrations', 'status', 'UPDATE'),
  'ordinary clients cannot update registration status'
);
select ok(
  not has_column_privilege('authenticated', 'public.volunteer_registrations', 'hours', 'UPDATE'),
  'ordinary clients cannot update registration hours'
);
select ok(
  not has_column_privilege('authenticated', 'public.volunteer_registrations', 'checked_in_at', 'UPDATE'),
  'ordinary clients cannot update registration check-in time'
);
select ok(
  not has_column_privilege('authenticated', 'public.attendance_sessions', 'check_out_at', 'UPDATE'),
  'ordinary clients cannot update attendance checkout time'
);
select ok(
  not has_column_privilege('authenticated', 'public.attendance_sessions', 'hours_logged', 'UPDATE'),
  'ordinary clients cannot update attendance hours directly'
);
select ok(
  not has_column_privilege('authenticated', 'public.volunteer_hour_adjustments', 'hours_delta', 'UPDATE'),
  'ordinary clients cannot update hour ledger deltas'
);

select * from finish();
rollback;
