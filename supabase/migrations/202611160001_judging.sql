-- Live pitch judging (e.g. a student "shark tank").
--
-- Judges open an unlisted /judging page and sign in with a personal code the
-- host gives them. The host picks which contestant is being judged, and every
-- judge's screen follows. As with the Q&A and feedback tools, browser roles
-- receive no direct privileges: judge and host traffic goes through server
-- routes that use the service role after authorization and validation.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

create table if not exists public.judging_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  is_current boolean not null default false,
  scores_locked boolean not null default false,
  current_contestant_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint judging_events_title_length
    check (char_length(trim(title)) between 1 and 120)
);

-- At most one judging event is open at /judging at a time.
create unique index if not exists judging_events_single_current_key
  on public.judging_events (is_current)
  where is_current;
create index if not exists judging_events_created_at_idx
  on public.judging_events (created_at desc);

drop trigger if exists judging_events_touch_updated_at on public.judging_events;
create trigger judging_events_touch_updated_at
before update on public.judging_events
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Contestants
-- ---------------------------------------------------------------------------

create table if not exists public.judging_contestants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.judging_events(id) on delete cascade,
  name text not null,
  project text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint judging_contestants_name_length
    check (char_length(trim(name)) between 1 and 80),
  constraint judging_contestants_project_length
    check (char_length(project) <= 120)
);

create index if not exists judging_contestants_event_position_idx
  on public.judging_contestants (event_id, position, created_at);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'judging_events_current_contestant_fkey'
  ) then
    alter table public.judging_events
      add constraint judging_events_current_contestant_fkey
      foreign key (current_contestant_id) references public.judging_contestants(id) on delete set null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Judges
-- ---------------------------------------------------------------------------

-- The access code is a short, host-visible sign-in code printed or read out
-- to each judge. It only grants scoring for its own event.
create table if not exists public.judging_judges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.judging_events(id) on delete cascade,
  name text not null,
  access_code text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint judging_judges_name_length
    check (char_length(trim(name)) between 1 and 80),
  constraint judging_judges_access_code_format
    check (access_code ~ '^[A-HJ-NP-Z2-9]{6}$')
);

create unique index if not exists judging_judges_access_code_key
  on public.judging_judges (access_code);
create index if not exists judging_judges_event_idx
  on public.judging_judges (event_id, created_at);

-- ---------------------------------------------------------------------------
-- Scores
-- ---------------------------------------------------------------------------

create table if not exists public.judging_scores (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.judging_events(id) on delete cascade,
  contestant_id uuid not null references public.judging_contestants(id) on delete cascade,
  judge_id uuid not null references public.judging_judges(id) on delete cascade,
  problem smallint,
  creativity smallint,
  stem smallint,
  design smallint,
  pitch smallint,
  comment text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint judging_scores_problem_range check (problem is null or problem between 1 and 10),
  constraint judging_scores_creativity_range check (creativity is null or creativity between 1 and 10),
  constraint judging_scores_stem_range check (stem is null or stem between 1 and 10),
  constraint judging_scores_design_range check (design is null or design between 1 and 10),
  constraint judging_scores_pitch_range check (pitch is null or pitch between 1 and 10),
  constraint judging_scores_comment_length check (char_length(comment) <= 1000)
);

-- One rubric per judge per contestant; saving again updates it.
create unique index if not exists judging_scores_judge_contestant_key
  on public.judging_scores (judge_id, contestant_id);
create index if not exists judging_scores_event_idx
  on public.judging_scores (event_id, contestant_id);

drop trigger if exists judging_scores_touch_updated_at on public.judging_scores;
create trigger judging_scores_touch_updated_at
before update on public.judging_scores
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- Switch the current event atomically so the single-current index never sees
-- two rows. Passing null clears the current event.
create or replace function public.judging_set_current_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.judging_events set is_current = false where is_current and id is distinct from p_event_id;
  if p_event_id is not null then
    update public.judging_events set is_current = true where id = p_event_id;
    if not found then
      raise exception 'event unavailable' using errcode = 'P0002';
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

alter table public.judging_events enable row level security;
alter table public.judging_events force row level security;
alter table public.judging_contestants enable row level security;
alter table public.judging_contestants force row level security;
alter table public.judging_judges enable row level security;
alter table public.judging_judges force row level security;
alter table public.judging_scores enable row level security;
alter table public.judging_scores force row level security;

revoke all on table public.judging_events from public, anon, authenticated;
revoke all on table public.judging_contestants from public, anon, authenticated;
revoke all on table public.judging_judges from public, anon, authenticated;
revoke all on table public.judging_scores from public, anon, authenticated;

grant select, insert, update, delete on table public.judging_events to service_role;
grant select, insert, update, delete on table public.judging_contestants to service_role;
grant select, insert, update, delete on table public.judging_judges to service_role;
grant select, insert, update on table public.judging_scores to service_role;

revoke all on function public.judging_set_current_event(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.judging_set_current_event(uuid) to service_role;
