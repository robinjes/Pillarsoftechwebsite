-- Release migration repair for the original volunteer schema.
--
-- The security foundation is intentionally additive for an existing project:
-- it leaves profiles.role and the legacy volunteer/attendance tables in place.
-- This forward migration copies rows into the versioned tables only when the
-- row can be validated against the existing auth UUID and the new constraints.
-- It never authorizes by email, deletes legacy rows, or publishes content.
--
-- Rows which cannot be copied are retained in their source table and recorded
-- in release_migration_issues. An unresolved issue is a release blocker;
-- resolve the owner-approved data mapping out of band and rerun the private
-- backfill function before enabling the new volunteer flow. This migration
-- never synthesizes an event mapping or publishes content.

create table if not exists public.release_migration_issues (
  source_table text not null,
  source_id text not null,
  issue_code text not null,
  details jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  primary key (source_table, source_id, issue_code),
  constraint release_migration_issues_source_table_check check (
    source_table in ('profiles', 'event_volunteers', 'check_in_sessions', 'attendance_logs')
  ),
  constraint release_migration_issues_details_object check (jsonb_typeof(details) = 'object')
);

alter table public.release_migration_issues enable row level security;
alter table public.release_migration_issues force row level security;
alter table public.release_migration_issues add column if not exists resolved_at timestamptz;
revoke all on table public.release_migration_issues from public, anon, authenticated, service_role;

create or replace function public.record_release_migration_issue(
  p_source_table text,
  p_source_id text,
  p_issue_code text,
  p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.release_migration_issues (
    source_table,
    source_id,
    issue_code,
    details
  )
  values (
    p_source_table,
    p_source_id,
    p_issue_code,
    case when jsonb_typeof(p_details) = 'object' then p_details else '{}'::jsonb end
  )
  on conflict (source_table, source_id, issue_code) do update
  set details = excluded.details,
      last_seen_at = timezone('utc', now()),
      resolved_at = null;
$$;

revoke all on function public.record_release_migration_issue(text, text, text, jsonb)
  from public, anon, authenticated, service_role;

create or replace function public.resolve_release_migration_issue(
  p_source_table text,
  p_source_id text,
  p_issue_code text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.release_migration_issues
  set resolved_at = timezone('utc', now()),
      last_seen_at = timezone('utc', now())
  where source_table = p_source_table
    and source_id = p_source_id
    and issue_code = p_issue_code
    and resolved_at is null;
$$;

revoke all on function public.resolve_release_migration_issue(text, text, text)
  from public, anon, authenticated, service_role;

-- Validate that a legacy event identifier has an owner-reviewed row in the
-- versioned table. Missing rows remain unresolved; this function never creates
-- guessed event content, changes an existing row, or publishes anything.
create or replace function public.ensure_release_event(
  p_event_id text,
  p_event_title text,
  p_source_table text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event_id is null or pg_catalog.btrim(p_event_id) = '' then
    perform public.record_release_migration_issue(
      p_source_table,
      coalesce(p_event_id, '<null>'),
      'missing_event_id',
      '{}'::jsonb
    );
    return false;
  end if;

  if p_event_id !~ '^[a-z0-9][a-z0-9_-]{0,63}$' then
    perform public.record_release_migration_issue(
      p_source_table,
      p_event_id,
      'invalid_event_id',
      pg_catalog.jsonb_build_object('reason', 'event id does not satisfy the versioned identifier contract')
    );
    return false;
  end if;

  if exists (select 1 from public.events where id = p_event_id) then
    perform public.resolve_release_migration_issue(
      p_source_table,
      p_event_id,
      'event_not_found'
    );
    perform public.resolve_release_migration_issue(
      p_source_table,
      p_event_id,
      'event_slug_conflict'
    );
    return true;
  end if;

  if exists (select 1 from public.events where slug = p_event_id) then
    perform public.record_release_migration_issue(
      p_source_table,
      p_event_id,
      'event_slug_conflict',
      pg_catalog.jsonb_build_object('reason', 'legacy id matches an existing event slug but not its id')
    );
    return false;
  end if;

  perform public.record_release_migration_issue(
    p_source_table,
    p_event_id,
    'event_not_found',
    pg_catalog.jsonb_build_object(
      'legacy_event_title', pg_catalog.left(coalesce(p_event_title, ''), 500),
      'reason', 'owner-reviewed events.id mapping is required before backfill'
    )
  );
  return false;
end;
$$;

revoke all on function public.ensure_release_event(text, text, text)
  from public, anon, authenticated, service_role;

-- The owner/operator can rerun this function after resolving an issue in a
-- reviewed staging copy. It has no browser grant and uses only existing UUIDs.
create or replace function public.run_release_legacy_backfill()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_row record;
  legacy_row record;
  event_ready boolean;
begin
  -- -------------------------------------------------------------------------
  -- Legacy profiles.role -> staff_members.
  -- -------------------------------------------------------------------------
  -- profiles.id is the existing Auth UUID. No email or provider metadata is
  -- read or compared here. The old role column remains non-authoritative and
  -- is intentionally preserved for rollback/audit until release verification.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    for source_row in execute $query$
      select id, role::text as legacy_role
      from public.profiles
      where lower(btrim(role::text)) in ('staff', 'admin')
      order by id
    $query$ loop
      if not exists (select 1 from auth.users where id = source_row.id) then
        perform public.record_release_migration_issue(
          'profiles',
          source_row.id::text,
          'auth_user_missing',
          pg_catalog.jsonb_build_object('legacy_role', source_row.legacy_role)
        );
        continue;
      end if;

      insert into public.staff_members (user_id)
      values (source_row.id)
      on conflict (user_id) do nothing;

      -- A later rerun may have repaired the Auth row after the first pass.
      -- Clear only the issue for this exact profile UUID; authority remains
      -- keyed by auth.users.id and never by an email match.
      perform public.resolve_release_migration_issue(
        'profiles',
        source_row.id::text,
        'auth_user_missing'
      );
    end loop;
  end if;

  -- -------------------------------------------------------------------------
  -- Legacy event identifiers are copied only when a configured event already
  -- owns that exact id. Missing mappings remain explicit release blockers;
  -- this migration never invents event rows or derives authorization from a
  -- title, slug, or email.
  -- -------------------------------------------------------------------------
  if pg_catalog.to_regclass('public.event_volunteers') is not null then
    for source_row in execute $query$
      select event_id, max(event_title) as event_title,
             count(distinct nullif(btrim(event_title), '')) as title_count
      from public.event_volunteers
      group by event_id
      order by event_id
    $query$ loop
      event_ready := public.ensure_release_event(
        source_row.event_id::text,
        source_row.event_title::text,
        'event_volunteers'
      );
      if source_row.title_count > 1 then
        perform public.record_release_migration_issue(
          'event_volunteers',
          coalesce(source_row.event_id::text, '<null>'),
          'conflicting_event_titles',
          pg_catalog.jsonb_build_object('distinct_title_count', source_row.title_count)
        );
      end if;
    end loop;
  end if;

  if pg_catalog.to_regclass('public.check_in_sessions') is not null then
    for source_row in execute $query$
      select distinct event_id
      from public.check_in_sessions
      order by event_id
    $query$ loop
      perform public.ensure_release_event(
        source_row.event_id::text,
        'Legacy event',
        'check_in_sessions'
      );
    end loop;
  end if;

  if pg_catalog.to_regclass('public.attendance_logs') is not null then
    for source_row in execute $query$
      select distinct event_id
      from public.attendance_logs
      order by event_id
    $query$ loop
      perform public.ensure_release_event(
        source_row.event_id::text,
        'Legacy event',
        'attendance_logs'
      );
    end loop;
  end if;

  -- -------------------------------------------------------------------------
  -- event_volunteers -> volunteer_registrations.
  -- -------------------------------------------------------------------------
  if pg_catalog.to_regclass('public.event_volunteers') is not null then
    for legacy_row in execute $query$
      select legacy_source.id,
             legacy_source.user_id,
             legacy_source.event_id,
             legacy_source.event_title,
             legacy_source.status,
             legacy_source.hours,
             (pg_catalog.to_jsonb(legacy_source) ->> 'checked_in_at')::timestamptz
               as checked_in_at,
             legacy_source.created_at
      from public.event_volunteers as legacy_source
      order by legacy_source.created_at, legacy_source.id
    $query$ loop
      event_ready := public.ensure_release_event(
        legacy_row.event_id::text,
        legacy_row.event_title::text,
        'event_volunteers'
      );
      if not event_ready then
        continue;
      end if;

      if legacy_row.user_id is null
         or not exists (select 1 from auth.users where id = legacy_row.user_id) then
        perform public.record_release_migration_issue(
          'event_volunteers',
          coalesce(legacy_row.id::text, '<null>'),
          'auth_user_missing',
          pg_catalog.jsonb_build_object('user_id', legacy_row.user_id::text)
        );
        continue;
      end if;

      if legacy_row.status is null
         or legacy_row.status not in ('registered', 'attended', 'absent') then
        perform public.record_release_migration_issue(
          'event_volunteers',
          coalesce(legacy_row.id::text, '<null>'),
          'invalid_registration_status',
          pg_catalog.jsonb_build_object('status', legacy_row.status::text)
        );
        continue;
      end if;

      if legacy_row.hours is null or legacy_row.hours < 0 then
        perform public.record_release_migration_issue(
          'event_volunteers',
          coalesce(legacy_row.id::text, '<null>'),
          'invalid_registration_hours',
          pg_catalog.jsonb_build_object('hours', legacy_row.hours::text)
        );
        continue;
      end if;

      if exists (
        select 1 from public.volunteer_registrations
        where user_id = legacy_row.user_id and event_id = legacy_row.event_id
      ) then
        perform public.resolve_release_migration_issue(
          'event_volunteers',
          coalesce(legacy_row.id::text, '<null>'),
          'registration_insert_failed'
        );
        continue;
      end if;

      if legacy_row.id is not null and exists (
        select 1 from public.volunteer_registrations
        where id = legacy_row.id
      ) then
        perform public.record_release_migration_issue(
          'event_volunteers',
          legacy_row.id::text,
          'registration_id_conflict',
          '{}'::jsonb
        );
        continue;
      end if;

      begin
        insert into public.volunteer_registrations (
          id,
          user_id,
          event_id,
          status,
          hours,
          checked_in_at,
          created_at,
          updated_at
        )
        values (
          coalesce(legacy_row.id, pg_catalog.gen_random_uuid()),
          legacy_row.user_id,
          legacy_row.event_id,
          legacy_row.status,
          legacy_row.hours,
          legacy_row.checked_in_at,
          coalesce(legacy_row.created_at, timezone('utc', now())),
          coalesce(legacy_row.created_at, timezone('utc', now()))
        );
        perform public.resolve_release_migration_issue(
          'event_volunteers',
          coalesce(legacy_row.id::text, '<null>'),
          'registration_insert_failed'
        );
      exception
        when foreign_key_violation or check_violation or unique_violation or not_null_violation then
          perform public.record_release_migration_issue(
            'event_volunteers',
            coalesce(legacy_row.id::text, '<null>'),
            'registration_insert_failed',
            pg_catalog.jsonb_build_object('sqlstate', sqlstate)
          );
      end;
    end loop;
  end if;

  -- -------------------------------------------------------------------------
  -- check_in_sessions -> attendance_sessions.
  -- -------------------------------------------------------------------------
  -- The new one-active-session-per-user index is authoritative. If legacy
  -- data contains multiple active sessions, the first deterministic row is
  -- copied and every additional row is retained plus recorded as unresolved.
  if pg_catalog.to_regclass('public.check_in_sessions') is not null then
    for legacy_row in execute $query$
      select id, user_id, event_id, check_in_time, check_out_time,
             hours_logged, created_at
      from public.check_in_sessions
      order by check_in_time, id
    $query$ loop
      event_ready := public.ensure_release_event(
        legacy_row.event_id::text,
        'Legacy event',
        'check_in_sessions'
      );
      if not event_ready then
        continue;
      end if;

      if legacy_row.user_id is null
         or not exists (select 1 from auth.users where id = legacy_row.user_id) then
        perform public.record_release_migration_issue(
          'check_in_sessions',
          coalesce(legacy_row.id::text, '<null>'),
          'auth_user_missing',
          pg_catalog.jsonb_build_object('user_id', legacy_row.user_id::text)
        );
        continue;
      end if;

      if legacy_row.check_in_time is null
         or (legacy_row.check_out_time is not null
             and legacy_row.check_in_time >= legacy_row.check_out_time) then
        perform public.record_release_migration_issue(
          'check_in_sessions',
          coalesce(legacy_row.id::text, '<null>'),
          'invalid_session_times',
          '{}'::jsonb
        );
        continue;
      end if;

      if legacy_row.hours_logged is null or legacy_row.hours_logged < 0 then
        perform public.record_release_migration_issue(
          'check_in_sessions',
          coalesce(legacy_row.id::text, '<null>'),
          'invalid_session_hours',
          pg_catalog.jsonb_build_object('hours_logged', legacy_row.hours_logged::text)
        );
        continue;
      end if;

      if exists (
        select 1 from public.attendance_sessions
        where user_id = legacy_row.user_id
          and event_id = legacy_row.event_id
          and check_in_at = legacy_row.check_in_time
      ) then
        perform public.resolve_release_migration_issue(
          'check_in_sessions',
          coalesce(legacy_row.id::text, '<null>'),
          'attendance_insert_failed'
        );
        continue;
      end if;

      if legacy_row.id is not null and exists (
        select 1 from public.attendance_sessions
        where id = legacy_row.id
      ) then
        perform public.record_release_migration_issue(
          'check_in_sessions',
          legacy_row.id::text,
          'attendance_id_conflict',
          '{}'::jsonb
        );
        continue;
      end if;

      if legacy_row.check_out_time is null and exists (
        select 1 from public.attendance_sessions
        where user_id = legacy_row.user_id and check_out_at is null
      ) then
        perform public.record_release_migration_issue(
          'check_in_sessions',
          coalesce(legacy_row.id::text, '<null>'),
          'active_session_conflict',
          '{}'::jsonb
        );
        continue;
      end if;

      begin
        insert into public.attendance_sessions (
          id,
          user_id,
          event_id,
          check_in_at,
          check_out_at,
          hours_logged,
          created_at,
          updated_at
        )
        values (
          coalesce(legacy_row.id, pg_catalog.gen_random_uuid()),
          legacy_row.user_id,
          legacy_row.event_id,
          legacy_row.check_in_time,
          legacy_row.check_out_time,
          legacy_row.hours_logged,
          coalesce(legacy_row.created_at, timezone('utc', now())),
          coalesce(legacy_row.created_at, timezone('utc', now()))
        );
        perform public.resolve_release_migration_issue(
          'check_in_sessions',
          coalesce(legacy_row.id::text, '<null>'),
          'attendance_insert_failed'
        );
      exception
        when foreign_key_violation or check_violation or unique_violation or not_null_violation then
          perform public.record_release_migration_issue(
            'check_in_sessions',
            coalesce(legacy_row.id::text, '<null>'),
            'attendance_insert_failed',
            pg_catalog.jsonb_build_object('sqlstate', sqlstate)
          );
      end;
    end loop;
  end if;

  -- -------------------------------------------------------------------------
  -- attendance_logs -> attendance_sessions.
  -- -------------------------------------------------------------------------
  -- A log that already has the same user/event/check-in instant as a migrated
  -- session is represented there. Other logs are copied with zero hours (the
  -- legacy table does not store a duration) while preserving both timestamps.
  if pg_catalog.to_regclass('public.attendance_logs') is not null then
    for legacy_row in execute $query$
      select id, volunteer_id, event_id, checked_in_at, checked_out_at
      from public.attendance_logs
      order by checked_in_at, id
    $query$ loop
      event_ready := public.ensure_release_event(
        legacy_row.event_id::text,
        'Legacy event',
        'attendance_logs'
      );
      if not event_ready then
        continue;
      end if;

      if legacy_row.volunteer_id is null
         or not exists (select 1 from auth.users where id = legacy_row.volunteer_id) then
        perform public.record_release_migration_issue(
          'attendance_logs',
          coalesce(legacy_row.id::text, '<null>'),
          'auth_user_missing',
          pg_catalog.jsonb_build_object('user_id', legacy_row.volunteer_id::text)
        );
        continue;
      end if;

      if legacy_row.checked_in_at is null
         or (legacy_row.checked_out_at is not null
             and legacy_row.checked_in_at >= legacy_row.checked_out_at) then
        perform public.record_release_migration_issue(
          'attendance_logs',
          coalesce(legacy_row.id::text, '<null>'),
          'invalid_log_times',
          '{}'::jsonb
        );
        continue;
      end if;

      if exists (
        select 1 from public.attendance_sessions
        where user_id = legacy_row.volunteer_id
          and event_id = legacy_row.event_id
          and check_in_at = legacy_row.checked_in_at
      ) then
        perform public.resolve_release_migration_issue(
          'attendance_logs',
          coalesce(legacy_row.id::text, '<null>'),
          'attendance_insert_failed'
        );
        continue;
      end if;

      if legacy_row.id is not null and exists (
        select 1 from public.attendance_sessions
        where id = legacy_row.id
      ) then
        perform public.record_release_migration_issue(
          'attendance_logs',
          legacy_row.id::text,
          'attendance_id_conflict',
          '{}'::jsonb
        );
        continue;
      end if;

      if legacy_row.checked_out_at is null and exists (
        select 1 from public.attendance_sessions
        where user_id = legacy_row.volunteer_id and check_out_at is null
      ) then
        perform public.record_release_migration_issue(
          'attendance_logs',
          coalesce(legacy_row.id::text, '<null>'),
          'active_session_conflict',
          '{}'::jsonb
        );
        continue;
      end if;

      begin
        insert into public.attendance_sessions (
          id,
          user_id,
          event_id,
          check_in_at,
          check_out_at,
          hours_logged,
          created_at,
          updated_at
        )
        values (
          coalesce(legacy_row.id, pg_catalog.gen_random_uuid()),
          legacy_row.volunteer_id,
          legacy_row.event_id,
          legacy_row.checked_in_at,
          legacy_row.checked_out_at,
          0,
          legacy_row.checked_in_at,
          legacy_row.checked_in_at
        );
        perform public.resolve_release_migration_issue(
          'attendance_logs',
          coalesce(legacy_row.id::text, '<null>'),
          'attendance_insert_failed'
        );
      exception
        when foreign_key_violation or check_violation or unique_violation or not_null_violation then
          perform public.record_release_migration_issue(
            'attendance_logs',
            coalesce(legacy_row.id::text, '<null>'),
            'attendance_insert_failed',
            pg_catalog.jsonb_build_object('sqlstate', sqlstate)
          );
      end;
    end loop;
  end if;
end;
$$;

revoke all on function public.run_release_legacy_backfill() from public, anon, authenticated, service_role;

-- Execute once as part of the migration. The operation is idempotent and
-- leaves every legacy source table and row untouched for rollback/review.
select public.run_release_legacy_backfill();
