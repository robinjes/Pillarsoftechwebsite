-- Task 03 contact inbox and shared durable abuse controls.
--
-- The rate-limit table is intentionally named for the future chat surface. It
-- is the one durable bucket store for both contact and chat; callers provide a
-- scope plus a keyed digest, never a raw request identity.

-- ---------------------------------------------------------------------------
-- Contact inbox status and keyset pagination support
-- ---------------------------------------------------------------------------

alter table public.contact_submissions
  drop constraint if exists contact_submissions_status_check;
alter table public.contact_submissions
  add constraint contact_submissions_status_check
  check (status in ('new', 'in_progress', 'resolved', 'spam'));

create index if not exists contact_submissions_created_at_id_idx
  on public.contact_submissions (created_at desc, id desc);
create index if not exists contact_submissions_status_created_at_id_idx
  on public.contact_submissions (status, created_at desc, id desc);

alter table public.contact_submissions enable row level security;
alter table public.contact_submissions force row level security;

-- Keep the existing staff read path, but make any future authenticated update
-- path explicitly staff-only and status-only. The application API uses the
-- server-side verified-staff check before its service-role write.
drop policy if exists contact_submissions_staff_read on public.contact_submissions;
create policy contact_submissions_staff_read on public.contact_submissions
for select to authenticated using (public.is_staff());
drop policy if exists contact_submissions_staff_update on public.contact_submissions;
create policy contact_submissions_staff_update on public.contact_submissions
for update to authenticated
using (public.is_staff())
with check (public.is_staff());

revoke all on table public.contact_submissions from public, anon, authenticated;
grant select (id, name, email, message, subject, school_name, student_count, status, created_at, updated_at)
on public.contact_submissions to authenticated;
grant select (id, name, email, message, subject, school_name, student_count, status, created_at, updated_at)
on public.contact_submissions to service_role;
grant insert on table public.contact_submissions to service_role;
grant update (status) on table public.contact_submissions to service_role;

-- ---------------------------------------------------------------------------
-- Shared durable contact/chat rate-limit buckets
-- ---------------------------------------------------------------------------

create table if not exists public.chat_rate_limit_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chat_rate_limit_buckets_key_length
    check (bucket_key ~ '^[a-z][a-z0-9_-]{0,31}:[0-9a-f]{64}$'),
  constraint chat_rate_limit_buckets_attempts_bounded
    check (attempts between 0 and 100),
  constraint chat_rate_limit_buckets_window_order
    check (window_started_at < expires_at)
);

create index if not exists chat_rate_limit_buckets_expires_at_idx
  on public.chat_rate_limit_buckets (expires_at);

alter table public.chat_rate_limit_buckets enable row level security;
alter table public.chat_rate_limit_buckets force row level security;
revoke all on table public.chat_rate_limit_buckets from public, anon, authenticated;

-- A single conditional upsert is the serialization point for a bucket. The
-- bounded prune keeps expired rows from accumulating without making a request
-- scan an unbounded table. A conflict at the same key waits for the prior
-- transaction and then reevaluates the attempt condition.
create or replace function public.consume_chat_rate_limit(
  p_bucket_key text,
  p_window_seconds integer,
  p_max_attempts integer,
  p_now timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  resulting_attempts integer;
begin
  if p_bucket_key is null
     or p_bucket_key !~ '^[a-z][a-z0-9_-]{0,31}:[0-9a-f]{64}$'
     or p_window_seconds is null
     or p_window_seconds < 1
     or p_window_seconds > 86400
     or p_max_attempts is null
     or p_max_attempts < 1
     or p_max_attempts > 100
     or p_now is null then
    raise exception 'invalid rate limit request' using errcode = '22023';
  end if;

  delete from public.chat_rate_limit_buckets
  where bucket_key in (
    select bucket_key
    from public.chat_rate_limit_buckets
    where expires_at <= p_now
    order by expires_at asc
    limit 100
  );

  insert into public.chat_rate_limit_buckets (
    bucket_key, window_started_at, attempts, expires_at, updated_at
  ) values (
    p_bucket_key,
    p_now,
    1,
    p_now + pg_catalog.make_interval(secs => p_window_seconds),
    p_now
  )
  on conflict (bucket_key) do update
  set window_started_at = case
        when chat_rate_limit_buckets.expires_at <= p_now then excluded.window_started_at
        else chat_rate_limit_buckets.window_started_at
      end,
      attempts = case
        when chat_rate_limit_buckets.expires_at <= p_now then 1
        else chat_rate_limit_buckets.attempts + 1
      end,
      expires_at = case
        when chat_rate_limit_buckets.expires_at <= p_now then excluded.expires_at
        else chat_rate_limit_buckets.expires_at
      end,
      updated_at = p_now
  where chat_rate_limit_buckets.expires_at <= p_now
     or chat_rate_limit_buckets.attempts < p_max_attempts
  returning attempts into resulting_attempts;

  return resulting_attempts is not null and resulting_attempts <= p_max_attempts;
end;
$$;

revoke all on function public.consume_chat_rate_limit(text, integer, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.consume_chat_rate_limit(text, integer, integer, timestamptz) to service_role;

-- PostgREST callers normally use the three-argument form. The timestamped
-- implementation intentionally has no default for p_now: keeping the exact
-- signatures distinct prevents PostgREST from seeing an ambiguous overload.
create or replace function public.consume_chat_rate_limit(
  p_bucket_key text,
  p_window_seconds integer,
  p_max_attempts integer
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select public.consume_chat_rate_limit(
    p_bucket_key,
    p_window_seconds,
    p_max_attempts,
    timezone('utc', now())
  );
$$;

revoke all on function public.consume_chat_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_chat_rate_limit(text, integer, integer) to service_role;
