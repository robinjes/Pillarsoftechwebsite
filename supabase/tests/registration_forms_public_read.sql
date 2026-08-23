-- Public registration forms compose with events RLS without exposing
-- publication or internal ownership fields.
begin;
select plan(13);

select has_table('public', 'events', 'events table exists for the public-read join');
select has_table('public', 'registration_forms', 'registration forms table exists');

insert into public.events (id, slug, title, status, publication_state)
values
  ('forms-public-published', 'forms-public-published', 'Published form event', 'upcoming', 'published'),
  ('forms-public-unpublished', 'forms-public-unpublished', 'Unpublished form event', 'upcoming', 'unpublished'),
  ('forms-public-draft', 'forms-public-draft', 'Draft form event', 'draft', 'unpublished');

insert into public.registration_forms (event_id, kind, fields, is_active)
values
  ('forms-public-published', 'participant', '[{"id":"full_name","type":"text","label":"Full name","required":true}]'::jsonb, true),
  ('forms-public-unpublished', 'participant', '[{"id":"full_name","type":"text","label":"Full name","required":true}]'::jsonb, true),
  ('forms-public-draft', 'participant', '[{"id":"full_name","type":"text","label":"Full name","required":true}]'::jsonb, true);

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);

select is(
  (select count(*) from public.events),
  1::bigint,
  'anonymous event reads include only the published event'
);
select is(
  (select count(*) from public.registration_forms),
  1::bigint,
  'anonymous form reads include only an active form for a published event'
);
select is(
  (select event_id from public.registration_forms),
  'forms-public-published',
  'anonymous form read is tied to the published event'
);
select is(
  (select is_active from public.registration_forms),
  true,
  'the exposed form is active'
);
select is(
  (select count(*) from public.registration_forms where event_id = 'forms-public-unpublished'),
  0::bigint,
  'anonymous clients cannot read forms for unpublished events'
);
select is(
  (select count(*) from public.registration_forms where event_id = 'forms-public-draft'),
  0::bigint,
  'anonymous clients cannot read forms for draft events'
);

select ok(
  not has_column_privilege('anon', 'public.events', 'publication_state', 'SELECT'),
  'anonymous clients do not receive event publication state'
);
select ok(
  not has_column_privilege('anon', 'public.registration_forms', 'created_at', 'SELECT'),
  'anonymous clients do not receive form creation timestamps'
);
select ok(
  not has_column_privilege('anon', 'public.registration_forms', 'updated_at', 'SELECT'),
  'anonymous clients do not receive form update timestamps'
);
select ok(
  not has_column_privilege('anon', 'public.registration_forms', 'created_by', 'SELECT'),
  'anonymous clients do not receive form ownership'
);
select ok(
  not has_column_privilege('anon', 'public.registration_forms', 'updated_by', 'SELECT'),
  'anonymous clients do not receive form updater identity'
);

select * from finish();
rollback;
