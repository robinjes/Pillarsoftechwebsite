-- Content registration security follow-up.
-- Keep this additive and versioned: deployed environments may already have
-- the foundation/content migrations applied.

-- ---------------------------------------------------------------------------
-- Preserve content ownership across upserts
-- ---------------------------------------------------------------------------

create or replace function public.preserve_content_created_by()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.created_by = old.created_by;
  elsif new.created_by is null then
    new.created_by = new.updated_by;
  end if;
  return new;
end;
$$;

revoke all on function public.preserve_content_created_by() from public;

drop trigger if exists registration_forms_preserve_created_by on public.registration_forms;
create trigger registration_forms_preserve_created_by
before insert or update on public.registration_forms
for each row execute function public.preserve_content_created_by();

drop trigger if exists impact_metrics_preserve_created_by on public.impact_metrics;
create trigger impact_metrics_preserve_created_by
before insert or update on public.impact_metrics
for each row execute function public.preserve_content_created_by();

drop trigger if exists site_content_preserve_created_by on public.site_content;
create trigger site_content_preserve_created_by
before insert or update on public.site_content
for each row execute function public.preserve_content_created_by();

-- ---------------------------------------------------------------------------
-- Atomic public participant registration
-- ---------------------------------------------------------------------------

create or replace function public.register_participant(
  p_event_id text,
  p_submitted_data jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_row public.events;
  form_row public.registration_forms;
  registration_id uuid;
  registration_count bigint;
begin
  -- The API validates answer values and exact form keys. Keep the RPC bounded
  -- as well so a future service caller cannot bypass the storage contract.
  if jsonb_typeof(p_submitted_data) is distinct from 'object'
     or (select count(*) from jsonb_object_keys(p_submitted_data)) > 40 then
    raise exception 'invalid participant answers' using errcode = 'P0005';
  end if;

  -- This row lock is the serialization point for capacity checks. Every
  -- concurrent registration for one event waits before counting/inserting.
  select * into event_row
  from public.events
  where id = p_event_id
  for update;

  if not found or event_row.publication_state <> 'published' then
    raise exception 'participant registration is unavailable' using errcode = 'P0002';
  end if;

  select * into form_row
  from public.registration_forms
  where event_id = p_event_id
    and kind = 'participant'
    and is_active
  for update;

  if not found then
    raise exception 'participant registration is unavailable' using errcode = 'P0002';
  end if;

  if event_row.participant_registration_state = 'full' then
    raise exception 'participant registration is full' using errcode = 'P0004';
  elsif event_row.participant_registration_state <> 'open' then
    raise exception 'participant registration is closed' using errcode = 'P0003';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_submitted_data) as submitted(key)
    where submitted.key !~ '^[a-z][a-z0-9_-]{0,31}$'
       or not exists (
         select 1
         from jsonb_array_elements(form_row.fields) as field
         where field->>'id' = submitted.key
       )
  ) then
    raise exception 'invalid participant answers' using errcode = 'P0005';
  end if;

  -- Form changes can race the API preflight. Re-check the answer shape against
  -- the locked active form before inserting: required fields must be present,
  -- checkbox values must be booleans, and all other supplied values must be
  -- JSON strings. Select/radio values must remain one of their options.
  if exists (
    select 1
    from jsonb_array_elements(form_row.fields) as field
    where (
         (field->>'required')::boolean
         and not (p_submitted_data ? (field->>'id'))
       )
       or (
         p_submitted_data ? (field->>'id')
         and (
         (field->>'type') = 'checkbox'
         and jsonb_typeof(p_submitted_data -> (field->>'id')) is distinct from 'boolean'
         )
       )
       or (
         p_submitted_data ? (field->>'id')
         and (
         (field->>'type') <> 'checkbox'
         and jsonb_typeof(p_submitted_data -> (field->>'id')) is distinct from 'string'
         )
       )
       or (
         p_submitted_data ? (field->>'id')
         and jsonb_typeof(p_submitted_data -> (field->>'id')) = 'string'
         and length(btrim(p_submitted_data ->> (field->>'id'))) > 2000
       )
       or (
         p_submitted_data ? (field->>'id')
         and (
         (field->>'type') in ('select', 'radio')
         and not exists (
           select 1
           from jsonb_array_elements(field->'options') as option
           where option #>> '{}' = p_submitted_data ->> (field->>'id')
         )
         )
       )
  ) then
    raise exception 'invalid participant answers' using errcode = 'P0005';
  end if;

  select count(*) into registration_count
  from public.participant_registrations
  where event_id = p_event_id;

  if event_row.participant_capacity is not null
     and registration_count >= event_row.participant_capacity then
    raise exception 'participant registration is full' using errcode = 'P0004';
  end if;

  insert into public.participant_registrations (event_id, submitted_data)
  values (p_event_id, p_submitted_data)
  returning id into registration_id;

  return registration_id;
end;
$$;

revoke all on function public.register_participant(text, jsonb) from public;
grant execute on function public.register_participant(text, jsonb) to service_role;
