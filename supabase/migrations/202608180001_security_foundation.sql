-- Pillars of Tech security foundation.
-- Deploy this migration to staging first. It is intentionally fail-closed:
-- public clients receive only explicitly public rows, while all sensitive
-- writes go through server/service-role code or security-definer RPCs.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared timestamp and validation helpers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

revoke all on function public.touch_updated_at() from public;

create or replace function public.valid_form_fields(value jsonb)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select jsonb_typeof(value) = 'array'
    and not exists (
      select 1
      from jsonb_array_elements(value) as item
      where jsonb_typeof(item) <> 'object'
         or item ?| array['apps_script_url', 'destination_column', 'destination', 'webhook_url']
         or exists (
           select 1
           from jsonb_object_keys(item) as key
           where key not in ('id', 'type', 'label', 'required', 'options')
         )
         or not (item ? 'id')
         or not (item ? 'type')
         or not (item ? 'label')
         or not (item ? 'required')
         or (item->>'type') not in ('text', 'email', 'textarea', 'select', 'radio', 'checkbox')
    );
$$;

revoke all on function public.valid_form_fields(jsonb) from public;

-- Remove legacy policies before removing the old role column or helper
-- overload. Legacy policies can depend on public.is_staff(uuid), so every
-- known application table is cleared before that function is replaced. The
-- dynamic guard keeps a fresh install (where these tables do not exist yet)
-- idempotent.
do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'profiles', 'staff_members', 'events', 'impact_metrics',
    'registration_forms', 'participant_registrations',
    'volunteer_registrations', 'attendance_sessions',
    'volunteer_hour_adjustments', 'site_content', 'media_assets',
    'contact_submissions', 'event_volunteers', 'check_in_sessions',
    'attendance_logs'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      for policy_name in
        select pol.polname
        from pg_policy pol
        join pg_class cls on cls.oid = pol.polrelid
        join pg_namespace nsp on nsp.oid = cls.relnamespace
        where nsp.nspname = 'public' and cls.relname = table_name
      loop
        execute format('drop policy if exists %I on public.%I', policy_name, table_name);
      end loop;
    end if;
  end loop;
end;
$$;

drop function if exists public.is_staff(uuid);
drop function if exists public.is_staff();

-- ---------------------------------------------------------------------------
-- Identity and server-controlled staff membership
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'POT Volunteer',
  email text not null default '',
  member_code text not null default ('POT-' || upper(encode(gen_random_bytes(8), 'hex'))),
  total_hours numeric(10, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_total_hours_nonnegative check (total_hours >= 0)
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists member_code text;
alter table public.profiles add column if not exists total_hours numeric(10, 2);
alter table public.profiles add column if not exists created_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz;
alter table public.profiles alter column full_name set default 'POT Volunteer';
alter table public.profiles alter column email set default '';
alter table public.profiles alter column member_code set default ('POT-' || upper(encode(gen_random_bytes(8), 'hex')));
alter table public.profiles alter column total_hours set default 0;
alter table public.profiles alter column created_at set default timezone('utc', now());
alter table public.profiles alter column updated_at set default timezone('utc', now());
update public.profiles set full_name = coalesce(nullif(trim(full_name), ''), 'POT Volunteer');
update public.profiles set email = coalesce(email, '');
-- Preserve existing totals; only repair null/invalid legacy values needed for
-- the protected non-negative invariant. Do not recalculate from old ledgers,
-- because checkout and adjustment rows may already be reflected in totals.
update public.profiles set total_hours = greatest(coalesce(total_hours, 0), 0);
-- New profiles use a 16-hex code. Existing POT-###### codes are retained so
-- deployed member badges remain valid; any other legacy value is migrated to
-- a deterministic code derived from the immutable profile id.
update public.profiles set member_code = case
  when trim(member_code) ~ '^POT-[0-9]{6}$' then trim(member_code)
  else 'POT-' || upper(substr(md5(id::text), 1, 16))
end
where member_code is null
   or trim(member_code) = ''
   or member_code !~ '^POT-(?:[0-9]{6}|[A-F0-9]{16})$';
update public.profiles set created_at = coalesce(created_at, timezone('utc', now()));
update public.profiles set updated_at = coalesce(updated_at, created_at, timezone('utc', now()));
alter table public.profiles alter column full_name set not null;
alter table public.profiles alter column email set not null;
alter table public.profiles alter column member_code set not null;
alter table public.profiles alter column total_hours set not null;
alter table public.profiles alter column created_at set not null;
alter table public.profiles alter column updated_at set not null;
alter table public.profiles drop column if exists role;
alter table public.profiles drop constraint if exists profiles_total_hours_nonnegative;
alter table public.profiles add constraint profiles_total_hours_nonnegative check (total_hours >= 0);
alter table public.profiles drop constraint if exists profiles_member_code_key;
alter table public.profiles add constraint profiles_member_code_key unique (member_code);
alter table public.profiles drop constraint if exists profiles_member_code_format;
alter table public.profiles add constraint profiles_member_code_format
  check (member_code ~ '^POT-(?:[0-9]{6}|[A-F0-9]{16})$');

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id) on delete set null
);

drop trigger if exists staff_members_touch_updated_at on public.staff_members;
create trigger staff_members_touch_updated_at
before update on public.staff_members
for each row execute function public.touch_updated_at();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.staff_members
      where user_id = auth.uid()
    );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), nullif(trim(new.raw_user_meta_data->>'name'), ''), 'POT Volunteer'),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Application tables
-- ---------------------------------------------------------------------------

create table if not exists public.events (
  id text primary key,
  slug text not null unique,
  title text not null,
  summary text not null default '',
  description text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text not null default 'America/New_York',
  start_label text not null default '',
  end_label text not null default '',
  location text not null default '',
  program_category text not null default 'general',
  status text not null default 'draft' check (status in ('draft', 'upcoming', 'ongoing', 'completed', 'cancelled')),
  media jsonb not null default '{}'::jsonb,
  resources jsonb not null default '{}'::jsonb,
  participant_registration_state text not null default 'closed' check (participant_registration_state in ('closed', 'open', 'full')),
  volunteer_registration_state text not null default 'closed' check (volunteer_registration_state in ('closed', 'open', 'full')),
  participant_capacity integer check (participant_capacity is null or participant_capacity > 0),
  volunteer_capacity integer check (volunteer_capacity is null or volunteer_capacity > 0),
  outcomes jsonb not null default '{}'::jsonb,
  publication_state text not null default 'unpublished' check (publication_state in ('unpublished', 'published')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint events_time_order check (starts_at is null or ends_at is null or starts_at < ends_at),
  constraint events_media_object check (jsonb_typeof(media) = 'object'),
  constraint events_resources_object check (jsonb_typeof(resources) = 'object'),
  constraint events_outcomes_object check (jsonb_typeof(outcomes) = 'object')
);

create table if not exists public.impact_metrics (
  key text primary key,
  value numeric not null,
  unit text not null default '',
  public_label text not null,
  as_of date,
  source_url text not null default '',
  methodology_note text not null default '',
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint impact_metrics_source_for_approval check (
    approval_status <> 'approved' or length(trim(source_url)) > 0
  )
);

create table if not exists public.registration_forms (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  kind text not null default 'participant' check (kind in ('participant', 'volunteer')),
  fields jsonb not null default '[]'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint registration_forms_fields_valid check (public.valid_form_fields(fields))
);

create table if not exists public.participant_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete restrict,
  submitted_data jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint participant_registrations_data_object check (jsonb_typeof(submitted_data) = 'object')
);

create table if not exists public.volunteer_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.events(id) on delete restrict,
  status text not null default 'registered' check (status in ('registered', 'attended', 'absent')),
  hours numeric(8, 2) not null default 0 check (hours >= 0),
  checked_in_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, event_id)
);

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.events(id) on delete restrict,
  check_in_at timestamptz not null default timezone('utc', now()),
  check_out_at timestamptz,
  hours_logged numeric(8, 2) not null default 0 check (hours_logged >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint attendance_sessions_time_order check (check_out_at is null or check_in_at < check_out_at)
);

create unique index if not exists attendance_sessions_one_active_per_user
on public.attendance_sessions(user_id)
where check_out_at is null;

create table if not exists public.volunteer_hour_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  adjusted_by uuid references auth.users(id) on delete set null,
  hours_delta numeric(8, 2) not null check (hours_delta <> 0),
  reason text not null default '',
  attendance_session_id uuid references public.attendance_sessions(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

-- Upgrade the original ledger without losing historical rows. The old schema
-- called the delta column `hours`, allowed a nullable reason, and linked the
-- actor to profiles. Existing rows may outlive a deleted actor, so historical
-- adjusted_by values are normalized to NULL before the new nullable
-- auth.users foreign key is installed. Current RPC inserts still require the
-- authenticated staff actor and therefore remain non-null in practice.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'volunteer_hour_adjustments'
      and column_name = 'hours'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'volunteer_hour_adjustments'
      and column_name = 'hours_delta'
  ) then
    alter table public.volunteer_hour_adjustments rename column hours to hours_delta;
  end if;
end;
$$;

alter table public.volunteer_hour_adjustments add column if not exists id uuid;
alter table public.volunteer_hour_adjustments add column if not exists user_id uuid;
alter table public.volunteer_hour_adjustments add column if not exists adjusted_by uuid;
alter table public.volunteer_hour_adjustments add column if not exists hours_delta numeric(8, 2);
alter table public.volunteer_hour_adjustments add column if not exists reason text;
alter table public.volunteer_hour_adjustments add column if not exists attendance_session_id uuid;
alter table public.volunteer_hour_adjustments add column if not exists created_at timestamptz;

update public.volunteer_hour_adjustments
set id = gen_random_uuid()
where id is null;
alter table public.volunteer_hour_adjustments alter column id set default gen_random_uuid();
alter table public.volunteer_hour_adjustments alter column id set not null;

update public.volunteer_hour_adjustments
set hours_delta = coalesce(hours_delta, 0),
    reason = coalesce(reason, ''),
    created_at = coalesce(created_at, timezone('utc', now()));
-- Callers must always provide an explicit delta. Existing rows were repaired
-- above, but a zero default would conflict with the nonzero write invariant.
alter table public.volunteer_hour_adjustments alter column hours_delta drop default;
alter table public.volunteer_hour_adjustments alter column hours_delta set not null;
alter table public.volunteer_hour_adjustments alter column reason set default '';
alter table public.volunteer_hour_adjustments alter column reason set not null;
alter table public.volunteer_hour_adjustments alter column created_at set default timezone('utc', now());
alter table public.volunteer_hour_adjustments alter column created_at set not null;
alter table public.volunteer_hour_adjustments alter column adjusted_by drop not null;

-- Remove any legacy actor/session foreign keys before replacing them with the
-- nullable, deletion-tolerant constraints owned by this migration.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.volunteer_hour_adjustments'::regclass
      and con.contype = 'f'
      and (
        pg_get_constraintdef(con.oid) ilike '%adjusted_by%'
        or pg_get_constraintdef(con.oid) ilike '%attendance_session_id%'
      )
  loop
    execute format('alter table public.volunteer_hour_adjustments drop constraint %I', constraint_name);
  end loop;
end;
$$;

update public.volunteer_hour_adjustments adjustments
set adjusted_by = null
where adjusted_by is not null
  and not exists (
    select 1 from auth.users
    where auth.users.id = adjustments.adjusted_by
  );

do $$
begin
  alter table public.volunteer_hour_adjustments
    add constraint volunteer_hour_adjustments_adjusted_by_fkey
    foreign key (adjusted_by) references auth.users(id) on delete set null;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter table public.volunteer_hour_adjustments
    add constraint volunteer_hour_adjustments_attendance_session_id_fkey
    foreign key (attendance_session_id)
    references public.attendance_sessions(id) on delete set null;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.volunteer_hour_adjustments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%hours_delta <> 0%'
  ) then
    alter table public.volunteer_hour_adjustments
      add constraint volunteer_hour_adjustments_hours_delta_nonzero
      check (hours_delta <> 0) not valid;
  end if;
end;
$$;

create table if not exists public.site_content (
  key text primary key,
  title text not null default '',
  body text not null default '',
  content jsonb not null default '{}'::jsonb,
  publication_state text not null default 'unpublished' check (publication_state in ('unpublished', 'published')),
  safe_for_public boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint site_content_json_object check (jsonb_typeof(content) = 'object')
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  original_filename text not null,
  content_type text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 104857600),
  sha256 text,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  status text not null default 'incoming' check (status in ('incoming', 'finalized', 'rejected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint media_assets_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'spam')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Generic update triggers keep audit timestamps database-controlled.
drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at before update on public.events
for each row execute function public.touch_updated_at();
drop trigger if exists impact_metrics_touch_updated_at on public.impact_metrics;
create trigger impact_metrics_touch_updated_at before update on public.impact_metrics
for each row execute function public.touch_updated_at();
drop trigger if exists registration_forms_touch_updated_at on public.registration_forms;
create trigger registration_forms_touch_updated_at before update on public.registration_forms
for each row execute function public.touch_updated_at();
drop trigger if exists volunteer_registrations_touch_updated_at on public.volunteer_registrations;
create trigger volunteer_registrations_touch_updated_at before update on public.volunteer_registrations
for each row execute function public.touch_updated_at();
drop trigger if exists attendance_sessions_touch_updated_at on public.attendance_sessions;
create trigger attendance_sessions_touch_updated_at before update on public.attendance_sessions
for each row execute function public.touch_updated_at();
drop trigger if exists site_content_touch_updated_at on public.site_content;
create trigger site_content_touch_updated_at before update on public.site_content
for each row execute function public.touch_updated_at();
drop trigger if exists media_assets_touch_updated_at on public.media_assets;
create trigger media_assets_touch_updated_at before update on public.media_assets
for each row execute function public.touch_updated_at();
drop trigger if exists contact_submissions_touch_updated_at on public.contact_submissions;
create trigger contact_submissions_touch_updated_at before update on public.contact_submissions
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS and least-privilege grants
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.staff_members enable row level security;
alter table public.events enable row level security;
alter table public.impact_metrics enable row level security;
alter table public.registration_forms enable row level security;
alter table public.participant_registrations enable row level security;
alter table public.volunteer_registrations enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.volunteer_hour_adjustments enable row level security;
alter table public.site_content enable row level security;
alter table public.media_assets enable row level security;
alter table public.contact_submissions enable row level security;

-- Remove every legacy policy on application tables so this migration owns the
-- policy surface. No client write policy is recreated for private tables.
do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'profiles', 'staff_members', 'events', 'impact_metrics',
    'registration_forms', 'participant_registrations',
    'volunteer_registrations', 'attendance_sessions',
    'volunteer_hour_adjustments', 'site_content', 'media_assets',
    'contact_submissions', 'event_volunteers', 'check_in_sessions',
    'attendance_logs'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      for policy_name in
        select pol.polname
        from pg_policy pol
        join pg_class cls on cls.oid = pol.polrelid
        join pg_namespace nsp on nsp.oid = cls.relnamespace
        where nsp.nspname = 'public' and cls.relname = table_name
      loop
        execute format('drop policy if exists %I on public.%I', policy_name, table_name);
      end loop;
    end if;
  end loop;
end;
$$;

create policy profiles_select_own on public.profiles
for select to authenticated using (auth.uid() = id);
create policy profiles_select_staff on public.profiles
for select to authenticated using (public.is_staff());

create policy staff_members_select_own on public.staff_members
for select to authenticated using (auth.uid() = user_id);
create policy staff_members_select_staff on public.staff_members
for select to authenticated using (public.is_staff());

create policy events_public_read on public.events
for select to anon, authenticated using (publication_state = 'published');
create policy events_staff_read on public.events
for select to authenticated using (public.is_staff());

create policy impact_metrics_public_read on public.impact_metrics
for select to anon, authenticated using (
  approval_status = 'approved' and length(trim(source_url)) > 0
);
create policy impact_metrics_staff_read on public.impact_metrics
for select to authenticated using (public.is_staff());

create policy registration_forms_public_read on public.registration_forms
for select to anon, authenticated using (
  is_active and exists (
    select 1 from public.events
    where events.id = registration_forms.event_id
      and events.publication_state = 'published'
  )
);
create policy registration_forms_staff_read on public.registration_forms
for select to authenticated using (public.is_staff());

create policy volunteer_registrations_select_own on public.volunteer_registrations
for select to authenticated using (auth.uid() = user_id);
create policy volunteer_registrations_select_staff on public.volunteer_registrations
for select to authenticated using (public.is_staff());

create policy attendance_sessions_select_own_completed on public.attendance_sessions
for select to authenticated using (auth.uid() = user_id and check_out_at is not null);
create policy attendance_sessions_select_staff on public.attendance_sessions
for select to authenticated using (public.is_staff());

create policy volunteer_hour_adjustments_select_staff on public.volunteer_hour_adjustments
for select to authenticated using (public.is_staff());

create policy site_content_public_read on public.site_content
for select to anon, authenticated using (
  publication_state = 'published' and safe_for_public
);
create policy site_content_staff_read on public.site_content
for select to authenticated using (public.is_staff());

create policy media_assets_public_read on public.media_assets
for select to anon, authenticated using (status = 'finalized' and visibility = 'public');
create policy media_assets_staff_read on public.media_assets
for select to authenticated using (public.is_staff());

create policy contact_submissions_staff_read on public.contact_submissions
for select to authenticated using (public.is_staff());

-- Legacy tables are retained for staged data review but are now fail-closed.
-- New application code must use the versioned tables above.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['event_volunteers', 'check_in_sessions', 'attendance_logs'] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from anon, authenticated', table_name);
    end if;
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'staff_members', 'events', 'impact_metrics',
    'registration_forms', 'participant_registrations',
    'volunteer_registrations', 'attendance_sessions',
    'volunteer_hour_adjustments', 'site_content', 'media_assets',
    'contact_submissions'
  ] loop
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end;
$$;

-- Public grants are column-scoped so RLS cannot accidentally expose audit,
-- moderation, or internal ownership fields through PostgREST.
grant select (id, slug, title, summary, description, starts_at, ends_at, timezone,
  start_label, end_label, location, program_category, status, media, resources,
  participant_registration_state, volunteer_registration_state)
on public.events to anon, authenticated;
grant select (key, value, unit, public_label, as_of, source_url, methodology_note, display_order)
on public.impact_metrics to anon, authenticated;
grant select (id, event_id, kind, fields, is_active)
on public.registration_forms to anon, authenticated;
grant select (key, title, body, content)
on public.site_content to anon, authenticated;
grant select (id, content_type, byte_size)
on public.media_assets to anon, authenticated;
grant select (id, full_name, email, member_code, total_hours, created_at, updated_at)
on public.profiles to authenticated;
grant select (user_id) on public.staff_members to authenticated;
grant select (id, user_id, event_id, status, hours, checked_in_at, created_at, updated_at)
on public.volunteer_registrations to authenticated;
grant select (id, user_id, event_id, check_in_at, check_out_at, hours_logged, created_at, updated_at)
on public.attendance_sessions to authenticated;
grant select (id, user_id, adjusted_by, hours_delta, reason, attendance_session_id, created_at)
on public.volunteer_hour_adjustments to authenticated;
grant select (id, name, email, message, status, created_at, updated_at)
on public.contact_submissions to authenticated;

-- ---------------------------------------------------------------------------
-- Security-definer registration and attendance RPCs
-- ---------------------------------------------------------------------------

create or replace function public.register_for_event(p_event_id text)
returns public.volunteer_registrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.volunteer_registrations;
  event_row public.events;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into event_row
  from public.events
  where id = p_event_id
    and publication_state = 'published'
    and volunteer_registration_state = 'open'
  for update;

  if not found then
    raise exception 'event is not open for volunteer registration' using errcode = '22023';
  end if;

  select * into result
  from public.volunteer_registrations
  where user_id = auth.uid() and event_id = p_event_id
  for update;

  -- A completed/absent record is historical and must not be reset by a new
  -- registration request. Return it unchanged; the UI can explain the state.
  if found then return result; end if;

  if event_row.volunteer_capacity is not null and (
    select count(*) from public.volunteer_registrations
    where event_id = p_event_id and status = 'registered'
  ) >= event_row.volunteer_capacity then
    raise exception 'event volunteer capacity is full' using errcode = '22023';
  end if;

  insert into public.volunteer_registrations (user_id, event_id)
  values (auth.uid(), p_event_id)
  returning * into result;
  return result;
end;
$$;

create or replace function public.cancel_event_registration(p_event_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.events
    where id = p_event_id
      and publication_state = 'published'
      and volunteer_registration_state = 'open'
      and (starts_at is null or starts_at > now())
  ) then
    raise exception 'event is not open for cancellation' using errcode = '22023';
  end if;

  delete from public.volunteer_registrations
  where user_id = auth.uid()
    and event_id = p_event_id
    and status = 'registered';
end;
$$;

revoke all on function public.cancel_event_registration(text) from public;

create or replace function public.staff_check_in_or_out(
  p_member_code text,
  p_event_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  volunteer public.profiles;
  event_row public.events;
  registration public.volunteer_registrations;
  active_session public.attendance_sessions;
  completed_session public.attendance_sessions;
  elapsed_hours numeric(8, 2);
  action_name text;
begin
  if not public.is_staff() then
    raise exception 'staff authorization required' using errcode = '42501';
  end if;

  select * into event_row
  from public.events
  where id = p_event_id and publication_state = 'published'
  for update;
  if not found then
    raise exception 'event is not published' using errcode = '22023';
  end if;

  select * into volunteer
  from public.profiles
  where member_code = p_member_code
  for update;
  if not found then
    raise exception 'volunteer member code not found' using errcode = '22023';
  end if;

  select * into active_session
  from public.attendance_sessions
  where user_id = volunteer.id and check_out_at is null
  for update;

  insert into public.volunteer_registrations (user_id, event_id)
  values (volunteer.id, p_event_id)
  on conflict (user_id, event_id) do nothing;
  select * into registration
  from public.volunteer_registrations
  where user_id = volunteer.id and event_id = p_event_id
  for update;

  if registration.status in ('attended', 'absent') then
    raise exception 'attendance for this event is already finalized' using errcode = '22023';
  end if;

  if active_session.id is null then
    insert into public.attendance_sessions (user_id, event_id)
    values (volunteer.id, p_event_id)
    returning * into active_session;
    update public.volunteer_registrations
    set status = 'registered', checked_in_at = active_session.check_in_at
    where id = registration.id
    returning * into registration;
    action_name := 'checkedIn';
    return jsonb_build_object(
      'profile', to_jsonb(volunteer),
      'registration', to_jsonb(registration),
      'action', action_name,
      'hours_logged', 0,
      'check_in_at', active_session.check_in_at
    );
  end if;

  if active_session.event_id <> p_event_id then
    raise exception 'volunteer is already checked in for another event' using errcode = '22023';
  end if;

  completed_session := active_session;
  -- clock_timestamp() records the actual checkout instant instead of the
  -- transaction-start time returned by now(). The one-microsecond floor keeps
  -- an immediate staff scan valid under the strict time-order constraint.
  completed_session.check_out_at := greatest(
    clock_timestamp(),
    completed_session.check_in_at + interval '1 microsecond'
  );
  elapsed_hours := round(
    extract(epoch from (completed_session.check_out_at - completed_session.check_in_at)) / 3600,
    2
  );
  completed_session.hours_logged := greatest(elapsed_hours, 0);

  update public.attendance_sessions
  set check_out_at = completed_session.check_out_at,
      hours_logged = completed_session.hours_logged
  where id = active_session.id
  returning * into completed_session;

  update public.volunteer_registrations
  set status = 'attended',
      hours = completed_session.hours_logged,
      checked_in_at = completed_session.check_in_at
  where id = registration.id
  returning * into registration;

  -- The profile row was locked above, so this database-owned total update is
  -- serialized with concurrent checkouts and cannot be double-counted.
  update public.profiles
  set total_hours = total_hours + completed_session.hours_logged
  where id = volunteer.id
  returning * into volunteer;

  -- A same-moment correction may legitimately round to 0.00 hours. Keep the
  -- completed session, but do not create a meaningless zero-value ledger row.
  if completed_session.hours_logged > 0 then
    insert into public.volunteer_hour_adjustments (
      user_id, adjusted_by, hours_delta, reason, attendance_session_id
    )
    values (
      volunteer.id, auth.uid(), completed_session.hours_logged,
      'Attendance session completed', completed_session.id
    );
  end if;

  action_name := 'checkedOut';
  return jsonb_build_object(
    'profile', to_jsonb(volunteer),
    'registration', to_jsonb(registration),
    'action', action_name,
    'hours_logged', completed_session.hours_logged,
    'check_in_at', completed_session.check_in_at,
    'check_out_at', completed_session.check_out_at
  );
end;
$$;

create or replace function public.staff_adjust_volunteer_hours(
  p_user_id uuid,
  p_hours numeric,
  p_reason text default ''
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_row public.profiles;
begin
  if not public.is_staff() then
    raise exception 'staff authorization required' using errcode = '42501';
  end if;
  if p_hours is null or p_hours = 0 then
    raise exception 'hour adjustment cannot be zero' using errcode = '22023';
  end if;

  -- Lock and update the profile total in the same transaction as the audit
  -- row. Negative adjustments may not create an impossible total.
  select * into profile_row
  from public.profiles
  where id = p_user_id
  for update;
  if not found then
    raise exception 'volunteer profile not found' using errcode = '22023';
  end if;
  if profile_row.total_hours + p_hours < 0 then
    raise exception 'hour adjustment would make total hours negative' using errcode = '22023';
  end if;

  update public.profiles
  set total_hours = total_hours + p_hours
  where id = p_user_id
  returning * into profile_row;

  insert into public.volunteer_hour_adjustments (user_id, adjusted_by, hours_delta, reason)
  values (p_user_id, auth.uid(), p_hours, coalesce(p_reason, ''));
  return profile_row;
end;
$$;

revoke all on function public.register_for_event(text) from public;
revoke all on function public.cancel_event_registration(text) from public;
revoke all on function public.staff_check_in_or_out(text, text) from public;
revoke all on function public.staff_adjust_volunteer_hours(uuid, numeric, text) from public;
grant execute on function public.register_for_event(text) to authenticated;
grant execute on function public.cancel_event_registration(text) to authenticated;
grant execute on function public.staff_check_in_or_out(text, text) to authenticated;
grant execute on function public.staff_adjust_volunteer_hours(uuid, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Private storage: service-role signed incoming uploads only
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('incoming-media', 'incoming-media', false, 104857600)
on conflict (id) do update
set public = false, file_size_limit = 104857600;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select pol.polname
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'storage' and cls.relname = 'objects'
      and pol.polname like '%incoming-media%'
  loop
    execute format('drop policy if exists %I on storage.objects', policy_name);
  end loop;
end;
$$;

-- No anon/authenticated storage write or read policy is granted. Server code
-- must use a guarded service-role client to sign an upload/download URL.
