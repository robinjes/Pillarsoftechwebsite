-- Task 03 content and registration hardening.
-- This migration only tightens the versioned local/staging schema. It does not
-- seed content, approval-only metrics, or staff identities.

create or replace function public.valid_form_fields(value jsonb)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when jsonb_typeof(value) is distinct from 'array' then false
    else jsonb_array_length(value) <= 40
      and (
        select count(*)
        from jsonb_array_elements(value) as item
      ) = (
        select count(distinct item->>'id')
        from jsonb_array_elements(value) as item
      )
      and not exists (
        select 1
        from jsonb_array_elements(value) as item
        where jsonb_typeof(item) is distinct from 'object'
           or item ?| array['apps_script_url', 'destination_column', 'destination', 'webhook_url', 'appsScriptUrl']
           or case when jsonb_typeof(item) = 'object' then exists (
             select 1
             from jsonb_object_keys(item) as key
             where key not in ('id', 'type', 'label', 'required', 'options', 'consent')
           ) else false end
           or jsonb_typeof(item->'id') is distinct from 'string'
           or length(trim(item->>'id')) < 1
           or length(trim(item->>'id')) > 32
           or (item->>'id') !~ '^[a-z][a-z0-9_-]*$'
           or jsonb_typeof(item->'type') is distinct from 'string'
           or (item->>'type') is null
           or (item->>'type') not in ('text', 'email', 'textarea', 'select', 'radio', 'checkbox')
           or jsonb_typeof(item->'label') is distinct from 'string'
           or length(trim(item->>'label')) < 1
           or length(trim(item->>'label')) > 160
           or jsonb_typeof(item->'required') is distinct from 'boolean'
           or (item ? 'consent' and jsonb_typeof(item->'consent') is distinct from 'boolean')
           or ((item->>'type') in ('select', 'radio') and (
             jsonb_typeof(item->'options') is distinct from 'array'
             or case when jsonb_typeof(item->'options') = 'array' then
               jsonb_array_length(item->'options') < 1
               or jsonb_array_length(item->'options') > 30
               or (
                 select count(*) from jsonb_array_elements(item->'options') as option
               ) <> (
                 select count(distinct option) from jsonb_array_elements(item->'options') as option
               )
               or exists (
                 select 1
                 from jsonb_array_elements(item->'options') as option
                 where jsonb_typeof(option) is distinct from 'string'
                    or length(trim(option #>> '{}')) < 1
                    or length(trim(option #>> '{}')) > 120
               )
             else false end
           ))
           or ((item->>'type') not in ('select', 'radio') and item ? 'options')
      )
  end;
$$;

revoke all on function public.valid_form_fields(jsonb) from public;

alter table public.impact_metrics
  drop constraint if exists impact_metrics_source_for_approval;
alter table public.impact_metrics
  add constraint impact_metrics_source_for_approval check (
    approval_status <> 'approved'
    or (
      length(trim(source_url)) > 0
      and as_of is not null
      and length(trim(methodology_note)) > 0
    )
  );

alter table public.events
  drop constraint if exists events_published_status_not_draft;
alter table public.events
  add constraint events_published_status_not_draft check (
    publication_state <> 'published' or status <> 'draft'
  );

create unique index if not exists registration_forms_event_kind_key
  on public.registration_forms(event_id, kind);

alter table public.contact_submissions add column if not exists subject text not null default '';
alter table public.contact_submissions add column if not exists school_name text not null default '';
alter table public.contact_submissions add column if not exists student_count text not null default '';

grant select (id, name, email, message, subject, school_name, student_count, status, created_at, updated_at)
on public.contact_submissions to authenticated;
