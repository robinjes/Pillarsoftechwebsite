-- Live audience Q&A (Slido-style) for in-person events.
--
-- The audience page is an unlisted route reached by QR code. Browser roles
-- receive no direct privileges: public reads and writes go through server
-- routes that use the service role after validation and rate limiting, and
-- host controls go through staff-authorized admin routes. Votes are keyed by
-- a peppered digest of an anonymous per-device token, never a raw identifier.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------

create table if not exists public.qna_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  is_current boolean not null default false,
  accepting_questions boolean not null default true,
  highlighted_question_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint qna_sessions_title_length
    check (char_length(trim(title)) between 1 and 120)
);

-- At most one session is shown at /qna at a time.
create unique index if not exists qna_sessions_single_current_key
  on public.qna_sessions (is_current)
  where is_current;
create index if not exists qna_sessions_created_at_idx
  on public.qna_sessions (created_at desc);

drop trigger if exists qna_sessions_touch_updated_at on public.qna_sessions;
create trigger qna_sessions_touch_updated_at
before update on public.qna_sessions
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Questions
-- ---------------------------------------------------------------------------

create table if not exists public.qna_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.qna_sessions(id) on delete cascade,
  body text not null,
  author_name text,
  status text not null default 'live',
  upvote_count integer not null default 0,
  visitor_token_digest text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint qna_questions_body_length
    check (char_length(trim(body)) between 3 and 300),
  constraint qna_questions_author_name_length
    check (author_name is null or char_length(trim(author_name)) between 1 and 60),
  constraint qna_questions_status_check
    check (status in ('live', 'answered', 'hidden')),
  constraint qna_questions_upvote_count_nonnegative
    check (upvote_count >= 0),
  constraint qna_questions_token_digest_format
    check (visitor_token_digest ~ '^[0-9a-f]{64}$')
);

create index if not exists qna_questions_session_created_at_idx
  on public.qna_questions (session_id, created_at desc);

drop trigger if exists qna_questions_touch_updated_at on public.qna_questions;
create trigger qna_questions_touch_updated_at
before update on public.qna_questions
for each row execute function public.touch_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'qna_sessions_highlighted_question_fkey'
  ) then
    alter table public.qna_sessions
      add constraint qna_sessions_highlighted_question_fkey
      foreign key (highlighted_question_id) references public.qna_questions(id) on delete set null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Votes
-- ---------------------------------------------------------------------------

create table if not exists public.qna_votes (
  question_id uuid not null references public.qna_questions(id) on delete cascade,
  visitor_token_digest text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (question_id, visitor_token_digest),
  constraint qna_votes_token_digest_format
    check (visitor_token_digest ~ '^[0-9a-f]{64}$')
);

-- Set (not toggle) a visitor's vote so retries are idempotent. The count is
-- maintained in the same statement as the vote row so it never drifts.
create or replace function public.qna_set_upvote(
  p_question_id uuid,
  p_visitor_token_digest text,
  p_upvoted boolean
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer := 0;
  resulting_count integer;
begin
  if p_question_id is null
     or p_upvoted is null
     or p_visitor_token_digest is null
     or p_visitor_token_digest !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid upvote request' using errcode = '22023';
  end if;

  perform 1
  from public.qna_questions q
  join public.qna_sessions s on s.id = q.session_id
  where q.id = p_question_id
    and q.status <> 'hidden'
    and s.is_current
  for update of q;

  if not found then
    raise exception 'question unavailable' using errcode = 'P0002';
  end if;

  if p_upvoted then
    insert into public.qna_votes (question_id, visitor_token_digest)
    values (p_question_id, p_visitor_token_digest)
    on conflict do nothing;
    get diagnostics changed = row_count;
    if changed > 0 then
      update public.qna_questions set upvote_count = upvote_count + 1 where id = p_question_id;
    end if;
  else
    delete from public.qna_votes
    where question_id = p_question_id and visitor_token_digest = p_visitor_token_digest;
    get diagnostics changed = row_count;
    if changed > 0 then
      update public.qna_questions set upvote_count = greatest(upvote_count - 1, 0) where id = p_question_id;
    end if;
  end if;

  select upvote_count into resulting_count from public.qna_questions where id = p_question_id;
  return resulting_count;
end;
$$;

-- Switch the current session atomically so the single-current index never
-- sees two rows. Passing null clears the current session.
create or replace function public.qna_set_current_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.qna_sessions set is_current = false where is_current and id is distinct from p_session_id;
  if p_session_id is not null then
    update public.qna_sessions set is_current = true where id = p_session_id;
    if not found then
      raise exception 'session unavailable' using errcode = 'P0002';
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

alter table public.qna_sessions enable row level security;
alter table public.qna_sessions force row level security;
alter table public.qna_questions enable row level security;
alter table public.qna_questions force row level security;
alter table public.qna_votes enable row level security;
alter table public.qna_votes force row level security;

revoke all on table public.qna_sessions from public, anon, authenticated;
revoke all on table public.qna_questions from public, anon, authenticated;
revoke all on table public.qna_votes from public, anon, authenticated;

grant select, insert, update, delete on table public.qna_sessions to service_role;
grant select, insert, update on table public.qna_questions to service_role;
grant select on table public.qna_votes to service_role;

revoke all on function public.qna_set_upvote(uuid, text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.qna_set_upvote(uuid, text, boolean) to service_role;

revoke all on function public.qna_set_current_session(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.qna_set_current_session(uuid) to service_role;
