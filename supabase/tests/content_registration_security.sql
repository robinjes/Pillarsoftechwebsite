-- Content ownership and participant registration RPC contract tests.
begin;
select plan(23);

select has_function(
  'public', 'register_participant', array['text', 'jsonb'],
  'atomic participant registration RPC exists'
);
select ok(
  has_function_privilege('service_role', 'public.register_participant(text,jsonb)', 'EXECUTE'),
  'only service_role can execute participant registration RPC'
);
select ok(
  not has_function_privilege('anon', 'public.register_participant(text,jsonb)', 'EXECUTE'),
  'anon cannot execute participant registration RPC'
);
select ok(
  not has_function_privilege('authenticated', 'public.register_participant(text,jsonb)', 'EXECUTE'),
  'authenticated cannot execute participant registration RPC'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgname = 'registration_forms_preserve_created_by'
  ),
  'form ownership preservation trigger exists'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgname = 'impact_metrics_preserve_created_by'
  ),
  'impact ownership preservation trigger exists'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgname = 'site_content_preserve_created_by'
  ),
  'site content ownership preservation trigger exists'
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
      'authenticated', 'authenticated', 'content-owner@example.test', '',
      now(), '{}'::jsonb, '{}'::jsonb, now(), now()
    ),
    (
      '40000000-0000-0000-0000-000000000004',
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'content-editor@example.test', '',
      now(), '{}'::jsonb, '{}'::jsonb, now(), now()
    )
  on conflict (id) do nothing;

  insert into public.events (
    id, slug, title, publication_state, status,
    participant_registration_state, participant_capacity
  ) values (
    'content-security-event', 'content-security-event', 'Content security event',
    'published', 'upcoming', 'open', 1
  ) on conflict (id) do nothing;

  insert into public.events (
    id, slug, title, publication_state, status,
    participant_registration_state
  ) values
    (
      'content-security-closed', 'content-security-closed', 'Closed content event',
      'published', 'upcoming', 'closed'
    ),
    (
      'content-security-unpublished', 'content-security-unpublished', 'Unpublished content event',
      'unpublished', 'upcoming', 'open'
    ),
    (
      'content-security-inactive', 'content-security-inactive', 'Inactive form event',
      'published', 'upcoming', 'open'
    )
  on conflict (id) do nothing;

  insert into public.registration_forms (
    event_id, kind, fields, is_active, updated_by
  ) values (
    'content-security-event', 'participant',
    '[{"id":"full_name","type":"text","label":"Full name","required":true},{"id":"nickname","type":"text","label":"Nickname","required":false}]'::jsonb,
    true, '30000000-0000-0000-0000-000000000003'
  );

  insert into public.registration_forms (
    event_id, kind, fields, is_active, updated_by
  ) values
    (
      'content-security-closed', 'participant',
      '[{"id":"full_name","type":"text","label":"Full name","required":true}]'::jsonb,
      true, '30000000-0000-0000-0000-000000000003'
    ),
    (
      'content-security-unpublished', 'participant',
      '[{"id":"full_name","type":"text","label":"Full name","required":true}]'::jsonb,
      true, '30000000-0000-0000-0000-000000000003'
    );

  insert into public.impact_metrics (
    key, value, public_label, approval_status, updated_by
  ) values (
    'content-security-impact', 1, 'Content security impact', 'pending',
    '30000000-0000-0000-0000-000000000003'
  );

  insert into public.site_content (
    key, title, body, content, updated_by
  ) values (
    'content-security-page', 'Content security page', '', '{}'::jsonb,
    '30000000-0000-0000-0000-000000000003'
  );
end;
$$;

select is(
  (select created_by from public.registration_forms where event_id = 'content-security-event' and kind = 'participant'),
  '30000000-0000-0000-0000-000000000003'::uuid,
  'new form records its updated_by as created_by'
);
select is(
  (select created_by from public.impact_metrics where key = 'content-security-impact'),
  '30000000-0000-0000-0000-000000000003'::uuid,
  'new impact records its updated_by as created_by'
);
select is(
  (select created_by from public.site_content where key = 'content-security-page'),
  '30000000-0000-0000-0000-000000000003'::uuid,
  'new site content records its updated_by as created_by'
);

update public.registration_forms
set fields = '[{"id":"full_name","type":"text","label":"Updated name","required":true},{"id":"nickname","type":"text","label":"Nickname","required":false}]'::jsonb,
    updated_by = '40000000-0000-0000-0000-000000000004'
where event_id = 'content-security-event' and kind = 'participant';
update public.impact_metrics
set public_label = 'Updated impact', updated_by = '40000000-0000-0000-0000-000000000004'
where key = 'content-security-impact';
update public.site_content
set title = 'Updated page', updated_by = '40000000-0000-0000-0000-000000000004'
where key = 'content-security-page';

select is(
  (select created_by from public.registration_forms where event_id = 'content-security-event' and kind = 'participant'),
  '30000000-0000-0000-0000-000000000003'::uuid,
  'form update preserves original created_by'
);
select is(
  (select created_by from public.impact_metrics where key = 'content-security-impact'),
  '30000000-0000-0000-0000-000000000003'::uuid,
  'impact update preserves original created_by'
);
select is(
  (select created_by from public.site_content where key = 'content-security-page'),
  '30000000-0000-0000-0000-000000000003'::uuid,
  'site content update preserves original created_by'
);

set local role service_role;
select throws_ok(
  $$select public.register_participant('content-security-event', '{}'::jsonb)$$,
  'P0005',
  'invalid participant answers',
  'missing participant answers are rejected'
);
select throws_ok(
  $$select public.register_participant('content-security-event', '{"full_name":true}'::jsonb)$$,
  'P0005',
  'invalid participant answers',
  'participant answer types are enforced by the RPC'
);
select throws_ok(
  $$select public.register_participant('content-security-event', jsonb_build_object('full_name', repeat('x', 2001)))$$,
  'P0005',
  'invalid participant answers',
  'participant answer lengths are bounded by the RPC'
);
select lives_ok(
  $$select public.register_participant('content-security-event', '{"full_name":"Ada"}'::jsonb)$$,
  'service role can register while omitting an optional participant field'
);
reset role;
select is(
  (select submitted_data from public.participant_registrations where event_id = 'content-security-event'),
  '{"full_name":"Ada"}'::jsonb,
  'participant registration persists exactly submitted answers'
);
set local role service_role;
select throws_ok(
  $$select public.register_participant('content-security-event', '{"full_name":"Grace"}'::jsonb)$$,
  'P0004',
  'participant registration is full',
  'participant capacity is enforced atomically'
);
select throws_ok(
  $$select public.register_participant('content-security-event', '{"unknown":"value"}'::jsonb)$$,
  'P0005',
  'invalid participant answers',
  'unknown submitted answer keys are rejected'
);
select throws_ok(
  $$select public.register_participant('content-security-closed', '{"full_name":"Ada"}'::jsonb)$$,
  'P0003',
  'participant registration is closed',
  'closed participant registration is rejected safely'
);
select throws_ok(
  $$select public.register_participant('content-security-unpublished', '{"full_name":"Ada"}'::jsonb)$$,
  'P0002',
  'participant registration is unavailable',
  'unpublished participant registration is rejected safely'
);
select throws_ok(
  $$select public.register_participant('content-security-inactive', '{"full_name":"Ada"}'::jsonb)$$,
  'P0002',
  'participant registration is unavailable',
  'inactive participant forms are rejected safely'
);

select * from finish();
rollback;
