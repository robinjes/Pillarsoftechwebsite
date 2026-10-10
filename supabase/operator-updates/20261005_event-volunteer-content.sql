-- Operator-run, review-only content update. This file is never applied by app
-- startup, a migration, or a build.
--
-- Gate: use only after following docs/security-release-runbook.md Sections 1,
-- 4, 6, and 7: owner-approved staging, schema/data backup evidence, reviewed
-- migrations, and successful staging policy/smoke checks. The script refuses
-- an absent or incompatible events schema and the absence of the registration
-- RPC. Do not create tables or weaken register_for_event from this file.
--
-- Career Panel must already be an upcoming/ongoing row. STEM Into the
-- Night is inserted unpublished for separate review and publication through
-- the approved staff workflow. Participant registration is school-only and
-- public participant registration stays closed. Existing media, capacities,
-- outcomes, audit actor fields, and publication state are preserved on conflict.
-- The existing updated_at trigger still records a content change normally.

begin;

do $$
declare
  incompatible_columns text[];
begin
  if to_regclass('public.events') is null or not exists (
    select 1
    from pg_class event_table
    join pg_namespace event_schema on event_schema.oid = event_table.relnamespace
    where event_schema.nspname = 'public'
      and event_table.relname = 'events'
      and event_table.relkind in ('r', 'p')
  ) then
    raise exception 'Refusing event content update: public.events is absent. Apply only the owner-approved event schema migrations through the documented staging and backup gates first.';
  end if;

  select array_agg(format('%s expected %s, found %s', required.column_name, required.data_type, coalesce(actual.data_type, 'missing')))
  into incompatible_columns
  from (values
    ('id', 'text'),
    ('slug', 'text'),
    ('branch', 'text'),
    ('title', 'text'),
    ('summary', 'text'),
    ('description', 'text'),
    ('starts_at', 'timestamp with time zone'),
    ('ends_at', 'timestamp with time zone'),
    ('timezone', 'text'),
    ('start_label', 'text'),
    ('end_label', 'text'),
    ('location', 'text'),
    ('program_category', 'text'),
    ('status', 'text'),
    ('media', 'jsonb'),
    ('resources', 'jsonb'),
    ('participant_registration_state', 'text'),
    ('volunteer_registration_state', 'text'),
    ('participant_capacity', 'integer'),
    ('volunteer_capacity', 'integer'),
    ('outcomes', 'jsonb'),
    ('publication_state', 'text')
  ) as required(column_name, data_type)
  left join information_schema.columns actual
    on actual.table_schema = 'public'
    and actual.table_name = 'events'
    and actual.column_name = required.column_name
  where actual.column_name is null or actual.data_type is distinct from required.data_type;

  if incompatible_columns is not null then
    raise exception 'Refusing event content update: public.events has incompatible columns: %', array_to_string(incompatible_columns, '; ');
  end if;

  if to_regclass('public.volunteer_registrations') is null then
    raise exception 'Refusing event content update: public.volunteer_registrations is absent. Apply the approved registration schema migrations through staging first.';
  end if;

  if to_regprocedure('public.register_for_event(text)') is null then
    raise exception 'Refusing event content update: public.register_for_event(text) is absent. Apply and validate the approved volunteer API migrations through staging first.';
  end if;
end;
$$;

insert into public.events as stored (
  id,
  slug,
  branch,
  title,
  summary,
  description,
  starts_at,
  ends_at,
  timezone,
  start_label,
  end_label,
  location,
  program_category,
  status,
  media,
  resources,
  participant_registration_state,
  volunteer_registration_state,
  participant_capacity,
  volunteer_capacity,
  outcomes,
  publication_state
) values (
  'stem-into-the-night-2026',
  'stem-into-the-night-2026',
  'ca',
  'STEM Into the Night',
  'A free evening of STEM exploration with Pillars of Tech and Junction Avenue K-8, featuring hands-on building challenges and live experiments.',
  'A free evening of STEM exploration with Pillars of Tech and Junction Avenue K-8, featuring hands-on building challenges and live experiments.',
  '2026-11-05T00:00:00.000Z'::timestamptz,
  '2026-11-05T01:30:00.000Z'::timestamptz,
  'America/Los_Angeles',
  'November 4, 2026',
  '4:00 PM - 5:30 PM',
  'Junction Avenue K-8 School, 298 Junction Ave, Livermore, CA 94551',
  'general',
  'upcoming',
  '{}'::jsonb,
  jsonb_build_object(
    'registrationNote', 'Registration is for Junction students only. The registration link will be shared through the school.'
  ),
  'closed',
  'open',
  null,
  null,
  '{}'::jsonb,
  'unpublished'
)
on conflict (id) do update set
  slug = excluded.slug,
  branch = excluded.branch,
  title = excluded.title,
  summary = excluded.summary,
  description = excluded.description,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  timezone = excluded.timezone,
  start_label = excluded.start_label,
  end_label = excluded.end_label,
  location = excluded.location,
  program_category = excluded.program_category,
  status = excluded.status,
  resources = (coalesce(stored.resources, '{}'::jsonb) - 'registrationLink') || excluded.resources,
  participant_registration_state = 'closed',
  volunteer_registration_state = 'open';

do $$
declare
  changed_rows integer;
begin
  update public.events
  set volunteer_registration_state = 'open',
      resources = coalesce(resources, '{}'::jsonb) || jsonb_build_object(
        'registrationLink', 'https://luma.com/event/evt-Kt3fAmxzXjJdAH2',
        'registrationNote', 'Use a non-school email.'
      )
  where id = 'career-panel-granada'
    and status in ('upcoming', 'ongoing');

  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'Refusing event content update: expected one current Career Panel event; changed % rows.', changed_rows;
  end if;
end;
$$;

commit;
