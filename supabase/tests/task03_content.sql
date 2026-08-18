-- Task 03 schema-level validation tests. Run on a fresh local database.
begin;
select plan(14);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'registration_forms_event_kind_key'
  ),
  'one form per event and kind is enforced'
);
select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contact_submissions' and column_name = 'subject'
  ),
  'contact subject persistence column exists'
);
select ok(
  public.valid_form_fields('[{"id":"full_name","type":"text","label":"Full name","required":true}]'::jsonb),
  'bounded text field is valid'
);
select ok(
  not public.valid_form_fields('[{"id":"email","type":"email","label":"Email","required":true,"destination":"https://evil.example"}]'::jsonb),
  'destination fields are rejected by the database contract'
);
select ok(
  not public.valid_form_fields('[{"id":"same","type":"text","label":"One","required":false},{"id":"same","type":"text","label":"Two","required":false}]'::jsonb),
  'duplicate field IDs are rejected by the database contract'
);
select ok(
  not public.valid_form_fields('[{"id":"choice","type":"select","label":"Choice","required":true}]'::jsonb),
  'choice fields require options'
);
select ok(
  not public.valid_form_fields('{}'::jsonb),
  'non-array form payloads are rejected without an exception'
);
select ok(
  not public.valid_form_fields('[{"id":"choice","type":"select","label":"Choice","required":true,"options":"not-an-array"}]'::jsonb),
  'malformed option payloads are rejected without an exception'
);

insert into public.events (id, slug, title, status, publication_state)
values ('task03-schema-event', 'task03-schema-event', 'Task 03 schema event', 'upcoming', 'unpublished')
on conflict (id) do nothing;

select lives_ok(
  $$insert into public.registration_forms (event_id, kind, fields, is_active)
    values ('task03-schema-event', 'participant', '[{"id":"full_name","type":"text","label":"Full name","required":true}]'::jsonb, false)$$,
  'valid form definition inserts'
);
select throws_ok(
  $$insert into public.registration_forms (event_id, kind, fields, is_active)
    values ('task03-schema-event', 'volunteer', '[{"id":"email","type":"email","label":"Email","required":true,"webhook_url":"https://evil.example"}]'::jsonb, false)$$,
  '23514',
  'new row for relation "registration_forms" violates check constraint "registration_forms_fields_valid"',
  'malformed form destinations cannot insert'
);
select throws_ok(
  $$insert into public.impact_metrics (key, value, public_label, approval_status)
    values ('task03-unreviewed', 1, 'Unreviewed', 'approved')$$,
  '23514',
  'new row for relation "impact_metrics" violates check constraint "impact_metrics_source_for_approval"',
  'approved metrics need source, methodology, and asOf'
);
select lives_ok(
  $$insert into public.impact_metrics (key, value, public_label, as_of, source_url, methodology_note, approval_status)
    values ('task03-reviewed', 1, 'Reviewed', '2026-08-18', 'https://pillarsoftech.org/methodology', 'Owner reviewed', 'approved')$$,
  'reviewed metric evidence is accepted'
);
select ok(
  not has_column_privilege('anon', 'public.impact_metrics', 'approval_status', 'SELECT'),
  'public impact grant excludes approval state'
);
select ok(
  not has_column_privilege('anon', 'public.contact_submissions', 'message', 'SELECT'),
  'anonymous role has no contact submission read privilege'
);

select * from finish();
rollback;
