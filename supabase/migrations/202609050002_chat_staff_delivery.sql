-- Task 2 chat staff operations, durable delivery, and retention storage.
--
-- This migration is deliberately forward-only.  Browser roles do not receive
-- table or function privileges.  The server-role repositories call the
-- narrow security-definer mutations below after the HTTP layer has verified a
-- staff session; the mutations independently validate the supplied Auth user
-- id against staff_members (and, when supplied, its active Discord mapping).
-- No function in this file performs a network request.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Private columns on the existing conversation/message records
-- ---------------------------------------------------------------------------

alter table public.chat_conversations
  add column if not exists discord_starter_message_id text,
  add column if not exists discord_starter_reference text,
  add column if not exists discord_starter_nonce text,
  add column if not exists discord_starter_state text not null default 'pending',
  add column if not exists discord_starter_claim_token uuid,
  add column if not exists discord_starter_claim_expires_at timestamptz,
  add column if not exists discord_starter_attempt_count integer not null default 0,
  add column if not exists discord_starter_failure_code text,
  add column if not exists discord_starter_next_retry_at timestamptz,
  add column if not exists discord_thread_lease_token uuid,
  add column if not exists discord_thread_lease_expires_at timestamptz;

-- Existing deployments have only the old pending/sent/failed conversation
-- delivery status.  Starter uncertainty is kept in the private starter state
-- so public transcript contracts do not accidentally expose claim internals.
alter table public.chat_conversations
  drop constraint if exists chat_conversations_starter_message_id_format;
alter table public.chat_conversations
  add constraint chat_conversations_starter_message_id_format
  check (discord_starter_message_id is null or discord_starter_message_id ~ '^[0-9]{1,30}$');

alter table public.chat_conversations
  drop constraint if exists chat_conversations_starter_state_check;
alter table public.chat_conversations
  add constraint chat_conversations_starter_state_check
  check (discord_starter_state in ('pending', 'claimed', 'uncertain', 'sent', 'failed'));

alter table public.chat_conversations
  drop constraint if exists chat_conversations_starter_attempts_bounded;
alter table public.chat_conversations
  add constraint chat_conversations_starter_attempts_bounded
  check (discord_starter_attempt_count between 0 and 20);

alter table public.chat_conversations
  drop constraint if exists chat_conversations_starter_reference_format;
alter table public.chat_conversations
  add constraint chat_conversations_starter_reference_format
  check (discord_starter_reference is null or discord_starter_reference ~ '^[A-Za-z0-9._:-]{1,160}$');

alter table public.chat_conversations
  drop constraint if exists chat_conversations_starter_nonce_format;
alter table public.chat_conversations
  add constraint chat_conversations_starter_nonce_format
  check (discord_starter_nonce is null or discord_starter_nonce ~ '^[A-Za-z0-9_-]{16,128}$');

alter table public.chat_conversations
  drop constraint if exists chat_conversations_starter_claim_pair;
alter table public.chat_conversations
  add constraint chat_conversations_starter_claim_pair
  check ((discord_starter_claim_token is null and discord_starter_claim_expires_at is null)
      or (discord_starter_claim_token is not null and discord_starter_claim_expires_at is not null));

alter table public.chat_conversations
  drop constraint if exists chat_conversations_thread_lease_pair;
alter table public.chat_conversations
  add constraint chat_conversations_thread_lease_pair
  check ((discord_thread_lease_token is null and discord_thread_lease_expires_at is null)
      or (discord_thread_lease_token is not null and discord_thread_lease_expires_at is not null));

alter table public.chat_conversations
  drop constraint if exists chat_conversations_starter_failure_length;
alter table public.chat_conversations
  add constraint chat_conversations_starter_failure_length
  check (discord_starter_failure_code is null or discord_starter_failure_code ~ '^[a-z0-9_:-]{1,64}$');

alter table public.chat_messages
  add column if not exists author_user_id uuid references auth.users(id) on delete set null,
  add column if not exists staff_message_id uuid,
  add column if not exists delivery_part_count integer;

alter table public.chat_messages
  drop constraint if exists chat_messages_delivery_part_count_check;
alter table public.chat_messages
  add constraint chat_messages_delivery_part_count_check
  check (delivery_part_count is null or delivery_part_count between 1 and 20);

create unique index if not exists chat_messages_conversation_staff_message_key
  on public.chat_messages (conversation_id, staff_message_id)
  where staff_message_id is not null;

create index if not exists chat_messages_staff_retry_order_idx
  on public.chat_messages (conversation_id, created_at asc, id asc)
  where sender = 'staff' and delivery_status in ('pending', 'failed');

-- ---------------------------------------------------------------------------
-- Durable Discord/admin action receipts (body-free)
-- ---------------------------------------------------------------------------

create table if not exists public.chat_action_receipts (
  interaction_id text primary key,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  conversation_id uuid,
  body_digest text,
  queue_open boolean,
  created_at timestamptz not null default timezone('utc', now()),
  constraint chat_action_receipts_interaction_id_format
    check (interaction_id ~ '^[A-Za-z0-9_-]{1,80}$'),
  constraint chat_action_receipts_action_check
    check (action in ('reply', 'close', 'spam', 'queue_open', 'queue_close')),
  constraint chat_action_receipts_body_digest_format
    check (body_digest is null or body_digest ~ '^[0-9a-f]{64}$'),
  constraint chat_action_receipts_queue_binding_check
    check ((action in ('queue_open', 'queue_close') and queue_open is not null and conversation_id is null and body_digest is null)
        or (action in ('reply', 'close', 'spam') and queue_open is null)),
  constraint chat_action_receipts_conversation_binding_check
    check ((action in ('queue_open', 'queue_close') and conversation_id is null)
        or (action in ('reply', 'close', 'spam') and conversation_id is not null))
);

alter table public.chat_action_receipts enable row level security;
alter table public.chat_action_receipts force row level security;
revoke all on table public.chat_action_receipts from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Durable message-part state (body-free)
-- ---------------------------------------------------------------------------

create table if not exists public.chat_message_parts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  part_index integer not null,
  part_count integer not null,
  stable_reference text not null,
  stable_nonce text not null,
  discord_message_id text,
  state text not null default 'pending',
  claim_token uuid,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0,
  failure_code text,
  next_retry_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chat_message_parts_part_index_check check (part_index >= 0 and part_index < 20),
  constraint chat_message_parts_part_count_check check (part_count between 1 and 20),
  constraint chat_message_parts_reference_format check (stable_reference ~ '^[A-Za-z0-9._:-]{1,160}$'),
  constraint chat_message_parts_nonce_format check (stable_nonce ~ '^[A-Za-z0-9_-]{16,128}$'),
  constraint chat_message_parts_discord_id_format check (discord_message_id is null or discord_message_id ~ '^[0-9]{1,30}$'),
  constraint chat_message_parts_state_check check (state in ('pending', 'claimed', 'uncertain', 'sent', 'failed')),
  constraint chat_message_parts_attempts_bounded check (attempt_count between 0 and 20),
  constraint chat_message_parts_failure_code_format check (failure_code is null or failure_code ~ '^[a-z0-9_:-]{1,64}$'),
  constraint chat_message_parts_claim_pair check ((claim_token is null and lease_expires_at is null)
      or (claim_token is not null and lease_expires_at is not null)),
  constraint chat_message_parts_sent_id_check check (state <> 'sent' or discord_message_id is not null),
  constraint chat_message_parts_part_index_count_check check (part_index < part_count),
  constraint chat_message_parts_message_part_key unique (message_id, part_index),
  constraint chat_message_parts_message_reference_key unique (message_id, stable_reference),
  constraint chat_message_parts_message_nonce_key unique (message_id, stable_nonce)
);

drop trigger if exists chat_message_parts_touch_updated_at on public.chat_message_parts;
create trigger chat_message_parts_touch_updated_at
before update on public.chat_message_parts
for each row execute function public.touch_updated_at();

create index if not exists chat_message_parts_delivery_order_idx
  on public.chat_message_parts (message_id, part_index asc);
create index if not exists chat_message_parts_claim_expiry_idx
  on public.chat_message_parts (lease_expires_at)
  where state = 'claimed' and lease_expires_at is not null;
create index if not exists chat_message_parts_retry_order_idx
  on public.chat_message_parts (next_retry_at asc, message_id asc, part_index asc)
  where state = 'failed';

-- ---------------------------------------------------------------------------
-- Body-free retention cleanup queue
-- ---------------------------------------------------------------------------

create table if not exists public.chat_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  guild_id text not null,
  parent_channel_id text not null,
  starter_message_id text,
  thread_id text,
  state text not null default 'pending',
  claim_token uuid,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0,
  failure_code text,
  next_retry_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  constraint chat_cleanup_jobs_guild_id_format check (guild_id ~ '^[0-9]{1,30}$'),
  constraint chat_cleanup_jobs_parent_channel_id_format check (parent_channel_id ~ '^[0-9]{1,30}$'),
  constraint chat_cleanup_jobs_starter_id_format check (starter_message_id is null or starter_message_id ~ '^[0-9]{1,30}$'),
  constraint chat_cleanup_jobs_thread_id_format check (thread_id is null or thread_id ~ '^[0-9]{1,30}$'),
  constraint chat_cleanup_jobs_state_check check (state in ('pending', 'claimed', 'uncertain', 'succeeded', 'failed')),
  constraint chat_cleanup_jobs_claim_pair check ((claim_token is null and lease_expires_at is null)
      or (claim_token is not null and lease_expires_at is not null)),
  constraint chat_cleanup_jobs_attempts_bounded check (attempt_count between 0 and 20),
  constraint chat_cleanup_jobs_failure_code_format check (failure_code is null or failure_code ~ '^[a-z0-9_:-]{1,64}$'),
  constraint chat_cleanup_jobs_conversation_key unique (conversation_id)
);

drop trigger if exists chat_cleanup_jobs_touch_updated_at on public.chat_cleanup_jobs;
create trigger chat_cleanup_jobs_touch_updated_at
before update on public.chat_cleanup_jobs
for each row execute function public.touch_updated_at();

create index if not exists chat_cleanup_jobs_pending_order_idx
  on public.chat_cleanup_jobs (next_retry_at asc, created_at asc, id asc)
  where state in ('pending', 'failed');

-- All private chat tables are explicitly inaccessible to browser roles.  The
-- service role receives read access used by server repositories; mutations
-- use the RPCs below so leases and actor checks remain centralized.
alter table public.chat_message_parts enable row level security;
alter table public.chat_message_parts force row level security;
alter table public.chat_cleanup_jobs enable row level security;
alter table public.chat_cleanup_jobs force row level security;

revoke all on table public.chat_message_parts from public, anon, authenticated, service_role;
revoke all on table public.chat_cleanup_jobs from public, anon, authenticated, service_role;
grant select on table public.chat_message_parts to service_role;
grant select on table public.chat_cleanup_jobs to service_role;

-- ---------------------------------------------------------------------------
-- Shared validation and safe internal helpers
-- ---------------------------------------------------------------------------

create or replace function public.chat_validate_staff_actor(
  p_staff_user_id uuid,
  p_discord_actor_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_staff_user_id is null
     or not exists (
       select 1 from public.staff_members where user_id = p_staff_user_id
     ) then
    raise exception 'staff authorization is unavailable' using errcode = 'P0006';
  end if;

  if p_discord_actor_id is not null
     and (
       p_discord_actor_id !~ '^[0-9]{1,30}$'
       or not exists (
         select 1
         from public.staff_discord_identities
         where user_id = p_staff_user_id
           and discord_user_id = p_discord_actor_id
           and active = true
       )
     ) then
    raise exception 'staff Discord mapping is unavailable' using errcode = 'P0008';
  end if;
end;
$$;

revoke all on function public.chat_validate_staff_actor(uuid, text) from public, anon, authenticated, service_role;

create or replace function public.chat_safe_retry_code(p_code text)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select p_code ~ '^[a-z0-9_:-]{1,64}$';
$$;

revoke all on function public.chat_safe_retry_code(text) from public, anon, authenticated, service_role;

-- Record a bounded interaction exactly once.  The returned boolean is true
-- for a new receipt and false for an exact replay; callers then return their
-- existing row/current state without repeating a mutation.  The receipt keeps
-- only a body digest, never a transcript body or token.
create or replace function public.chat_record_action_receipt(
  p_interaction_id text,
  p_actor_user_id uuid,
  p_action text,
  p_conversation_id uuid,
  p_body_digest text,
  p_queue_open boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_receipt public.chat_action_receipts;
begin
  if p_interaction_id is null or p_interaction_id !~ '^[A-Za-z0-9_-]{1,80}$'
     or p_action not in ('reply', 'close', 'spam', 'queue_open', 'queue_close')
     or (p_body_digest is not null and p_body_digest !~ '^[0-9a-f]{64}$') then
    raise exception 'invalid action receipt' using errcode = '22023';
  end if;
  perform public.chat_validate_staff_actor(p_actor_user_id, null);

  insert into public.chat_action_receipts (
    interaction_id, actor_user_id, action, conversation_id, body_digest, queue_open
  ) values (
    p_interaction_id, p_actor_user_id, p_action, p_conversation_id, p_body_digest, p_queue_open
  )
  on conflict (interaction_id) do nothing;
  if found then return true; end if;

  select * into existing_receipt
  from public.chat_action_receipts
  where interaction_id = p_interaction_id
  for update;
  if existing_receipt.actor_user_id = p_actor_user_id
     and existing_receipt.action = p_action
     and existing_receipt.conversation_id is not distinct from p_conversation_id
     and existing_receipt.body_digest is not distinct from p_body_digest
     and existing_receipt.queue_open is not distinct from p_queue_open then
    return false;
  end if;
  raise exception 'action interaction id conflict' using errcode = 'P0005';
end;
$$;

revoke all on function public.chat_record_action_receipt(text, uuid, text, uuid, text, boolean)
from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Staff queue operations
-- ---------------------------------------------------------------------------

create or replace function public.chat_set_queue_state_at(
  p_staff_user_id uuid,
  p_queue_open boolean,
  p_now timestamptz,
  p_action_id text,
  p_discord_actor_id text
)
returns public.chat_queue_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  queue_row public.chat_queue_state;
  local_at timestamp without time zone;
  now_at timestamptz;
  expires_at timestamptz;
begin
  perform public.chat_validate_staff_actor(p_staff_user_id, p_discord_actor_id);
  if p_queue_open is null then
    raise exception 'invalid queue state' using errcode = '22023';
  end if;
  if p_action_id is null or p_action_id !~ '^[A-Za-z0-9_-]{1,80}$' then
    raise exception 'invalid queue action id' using errcode = '22023';
  end if;

  -- Queue writers serialize on the singleton before any state change.  All
  -- visitor writers use this same first lock, so a close cannot race a send.
  select * into queue_row
  from public.chat_queue_state
  where singleton_key = 'default'
  for update;
  if not found then
    raise exception 'chat queue is unavailable' using errcode = 'P0003';
  end if;

  -- Production callers pass NULL so the authoritative time is sampled after
  -- the singleton lock.  Deterministic test callers pass a fixed instant.
  now_at := coalesce(p_now, clock_timestamp());

  if not p_queue_open then
    if not public.chat_record_action_receipt(p_action_id, p_staff_user_id, 'queue_close', null, null, false) then
      return queue_row;
    end if;
    update public.chat_queue_state
    set queue_open = false,
        queue_expires_at = null,
        updated_by = p_staff_user_id
    where singleton_key = 'default'
    returning * into queue_row;
    return queue_row;
  end if;

  local_at := now_at at time zone 'America/Los_Angeles';
  if extract(isodow from local_at)::integer not between 1 and 5
     or local_at::time < time '16:00'
     or local_at::time >= time '22:00'
     or not exists (
       select 1
       from public.chat_office_hours
       where weekday = extract(isodow from local_at)::smallint
         and open_time = '16:00'
         and close_time = '22:00'
         and timezone = 'America/Los_Angeles'
         and enabled
     ) then
    raise exception 'queue may only open during staffed hours' using errcode = 'P0009';
  end if;

  -- A replayed open action is a no-op even if another action (for example a
  -- later explicit close) changed the queue after the original receipt.
  if not public.chat_record_action_receipt(p_action_id, p_staff_user_id, 'queue_open', null, null, true) then
    select * into queue_row from public.chat_queue_state where singleton_key = 'default';
    return queue_row;
  end if;

  expires_at := (local_at::date + time '22:00') at time zone 'America/Los_Angeles';
  update public.chat_queue_state
  set queue_open = true,
      queue_expires_at = expires_at,
      updated_by = p_staff_user_id
  where singleton_key = 'default'
  returning * into queue_row;
  return queue_row;
end;
$$;

create or replace function public.set_chat_queue_state(
  p_staff_user_id uuid,
  p_queue_open boolean,
  p_action_id text,
  p_discord_actor_id text
)
returns public.chat_queue_state
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.chat_set_queue_state_at(p_staff_user_id, p_queue_open, null, p_action_id, p_discord_actor_id);
end;
$$;

-- Revoked deterministic helper for local pgTAP coverage.  It is not an API
-- path and intentionally has no default arguments.
create or replace function public.chat_test_set_queue_state(
  p_staff_user_id uuid,
  p_queue_open boolean,
  p_now timestamptz,
  p_action_id text,
  p_discord_actor_id text
)
returns public.chat_queue_state
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.chat_set_queue_state_at(p_staff_user_id, p_queue_open, p_now, p_action_id, p_discord_actor_id);
end;
$$;

revoke all on function public.chat_set_queue_state_at(uuid, boolean, timestamptz, text, text) from public, anon, authenticated, service_role;
revoke all on function public.set_chat_queue_state(uuid, boolean, text, text) from public, anon, authenticated, service_role;
grant execute on function public.set_chat_queue_state(uuid, boolean, text, text) to service_role;
revoke all on function public.chat_test_set_queue_state(uuid, boolean, timestamptz, text, text) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Staff replies and terminal conversation actions
-- ---------------------------------------------------------------------------

create or replace function public.insert_chat_staff_message(
  p_conversation_id uuid,
  p_staff_user_id uuid,
  p_staff_message_id uuid,
  p_body text,
  p_source_interaction_id text,
  p_discord_actor_id text
)
returns public.chat_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  queue_row public.chat_queue_state;
  conversation_row public.chat_conversations;
  message_row public.chat_messages;
  now_at timestamptz;
  body_digest text;
  receipt_is_new boolean;
begin
  if p_conversation_id is null
     or p_staff_message_id is null
     or p_body is null
     or char_length(btrim(p_body)) not between 1 and 4000
     or position('<' in p_body) > 0
     or position('>' in p_body) > 0
     or (p_source_interaction_id is not null and p_source_interaction_id !~ '^[0-9]{1,30}$') then
    raise exception 'invalid staff message' using errcode = '22023';
  end if;
  perform public.chat_validate_staff_actor(p_staff_user_id, p_discord_actor_id);

  -- Keep queue then conversation lock order with every other conversation
  -- writer.  Staff replies intentionally do not require the queue to be open:
  -- an unexpired conversation can receive a reply after public hours.
  select * into queue_row
  from public.chat_queue_state
  where singleton_key = 'default'
  for update;
  if not found then
    raise exception 'chat queue is unavailable' using errcode = 'P0003';
  end if;
  select * into conversation_row
  from public.chat_conversations
  where id = p_conversation_id
  for update;
  if not found then
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;

  -- A Discord interaction receipt is checked before the current conversation
  -- status.  An exact retry after a terminal action returns its original
  -- stored reply; it never creates a second website message.
  if p_source_interaction_id is not null then
    body_digest := encode(extensions.digest(btrim(p_body), 'sha256'), 'hex');
    receipt_is_new := public.chat_record_action_receipt(
      p_source_interaction_id, p_staff_user_id, 'reply', conversation_row.id, body_digest, null
    );
    if not receipt_is_new then
      select * into message_row
      from public.chat_messages
      where source_interaction_id = p_source_interaction_id
        and conversation_id = conversation_row.id
      for update;
      if found then return message_row; end if;
      raise exception 'chat message was not found' using errcode = 'P0002';
    end if;
  end if;

  -- Admin retries may not carry a Discord interaction id, but their UUID key
  -- remains idempotent and should also return the original row after closure.
  select * into message_row
  from public.chat_messages
  where conversation_id = conversation_row.id
    and staff_message_id = p_staff_message_id
  for update;
  if found then
    if message_row.sender = 'staff'
       and message_row.body = btrim(p_body)
       and message_row.author_user_id = p_staff_user_id then
      return message_row;
    end if;
    raise exception 'staff message id conflict' using errcode = 'P0005';
  end if;

  now_at := clock_timestamp();
  if conversation_row.status <> 'open'
     or conversation_row.ownership_expires_at <= now_at then
    raise exception 'chat conversation is closed' using errcode = 'P0003';
  end if;

  insert into public.chat_messages (
    conversation_id,
    client_message_id,
    staff_message_id,
    author_user_id,
    sender,
    body,
    delivery_status,
    delivery_attempts,
    source_interaction_id,
    created_at,
    updated_at
  ) values (
    conversation_row.id,
    null,
    p_staff_message_id,
    p_staff_user_id,
    'staff',
    btrim(p_body),
    'pending',
    0,
    p_source_interaction_id,
    now_at,
    now_at
  )
  returning * into message_row;
  return message_row;
exception
  when unique_violation then
    -- Concurrent retries are resolved only within this conversation.  If the
    -- conflict belongs elsewhere, return a generic conflict instead.
    select * into message_row
    from public.chat_messages
    where conversation_id = p_conversation_id
      and staff_message_id = p_staff_message_id
    for update;
    if found and message_row.sender = 'staff'
       and message_row.body = btrim(p_body)
       and message_row.author_user_id = p_staff_user_id then
      return message_row;
    end if;
    raise exception 'staff message id conflict' using errcode = 'P0005';
end;
$$;

create or replace function public.set_chat_conversation_terminal(
  p_conversation_id uuid,
  p_staff_user_id uuid,
  p_status text,
  p_discord_actor_id text,
  p_action_id text
)
returns public.chat_conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  queue_row public.chat_queue_state;
  conversation_row public.chat_conversations;
begin
  if p_conversation_id is null or p_status not in ('closed', 'spam')
     or (p_action_id is not null and p_action_id !~ '^[A-Za-z0-9_-]{1,80}$') then
    raise exception 'invalid terminal state' using errcode = '22023';
  end if;
  perform public.chat_validate_staff_actor(p_staff_user_id, p_discord_actor_id);

  select * into queue_row
  from public.chat_queue_state
  where singleton_key = 'default'
  for update;
  if not found then
    raise exception 'chat queue is unavailable' using errcode = 'P0003';
  end if;
  select * into conversation_row
  from public.chat_conversations
  where id = p_conversation_id
  for update;
  if not found then
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;

  if p_action_id is not null
     and not public.chat_record_action_receipt(
       p_action_id, p_staff_user_id,
       case when p_status = 'closed' then 'close' else 'spam' end,
       conversation_row.id, null, null
     ) then
    return conversation_row;
  end if;

  if conversation_row.status in ('closed', 'spam') then
    if conversation_row.status = p_status then
      -- Duplicate terminal actions are idempotent and, crucially, do not
      -- refresh or otherwise mutate terminal_at.
      return conversation_row;
    end if;
    raise exception 'conversation already has another terminal state' using errcode = 'P0005';
  end if;

  update public.chat_conversations
  set status = p_status,
      terminal_at = clock_timestamp()
  where id = conversation_row.id
  returning * into conversation_row;
  return conversation_row;
end;
$$;

create or replace function public.set_chat_conversation_terminal(
  p_conversation_id uuid,
  p_staff_user_id uuid,
  p_status text,
  p_discord_actor_id text
)
returns public.chat_conversations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.set_chat_conversation_terminal(
    p_conversation_id, p_staff_user_id, p_status, p_discord_actor_id, null
  );
end;
$$;

revoke all on function public.insert_chat_staff_message(uuid, uuid, uuid, text, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.insert_chat_staff_message(uuid, uuid, uuid, text, text, text) to service_role;
revoke all on function public.set_chat_conversation_terminal(uuid, uuid, text, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.set_chat_conversation_terminal(uuid, uuid, text, text, text) to service_role;
revoke all on function public.set_chat_conversation_terminal(uuid, uuid, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.set_chat_conversation_terminal(uuid, uuid, text, text) to service_role;
grant execute on function public.set_chat_conversation_terminal(uuid, uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Conversation/thread lease and starter delivery state
-- ---------------------------------------------------------------------------

create or replace function public.claim_chat_thread_lease(
  p_conversation_id uuid,
  p_lease_token uuid,
  p_lease_seconds integer
)
returns public.chat_conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_row public.chat_conversations;
  now_at timestamptz;
begin
  if p_conversation_id is null or p_lease_token is null or p_lease_seconds not between 1 and 300 then
    raise exception 'invalid delivery lease' using errcode = '22023';
  end if;
  select * into conversation_row
  from public.chat_conversations
  where id = p_conversation_id
  for update;
  if not found then
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;
  now_at := clock_timestamp();
  if conversation_row.discord_thread_lease_token is not null
     and conversation_row.discord_thread_lease_expires_at > now_at
     and conversation_row.discord_thread_lease_token <> p_lease_token then
    raise exception 'delivery lease is already held' using errcode = 'P0007';
  end if;
  update public.chat_conversations
  set discord_thread_lease_token = p_lease_token,
      discord_thread_lease_expires_at = now_at + pg_catalog.make_interval(secs => p_lease_seconds)
  where id = conversation_row.id
  returning * into conversation_row;
  return conversation_row;
end;
$$;

create or replace function public.release_chat_thread_lease(
  p_conversation_id uuid,
  p_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_token uuid;
begin
  if p_conversation_id is null or p_lease_token is null then
    return false;
  end if;
  select discord_thread_lease_token into current_token
  from public.chat_conversations
  where id = p_conversation_id
  for update;
  if not found or current_token is distinct from p_lease_token then
    return false;
  end if;
  update public.chat_conversations
  set discord_thread_lease_token = null,
      discord_thread_lease_expires_at = null
  where id = p_conversation_id
    and discord_thread_lease_token = p_lease_token;
  return true;
end;
$$;

create or replace function public.prepare_chat_starter_delivery(
  p_conversation_id uuid,
  p_thread_lease_token uuid,
  p_stable_reference text,
  p_stable_nonce text
)
returns public.chat_conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_row public.chat_conversations;
  now_at timestamptz;
begin
  if p_conversation_id is null or p_thread_lease_token is null
     or p_stable_reference is null or p_stable_reference !~ '^[A-Za-z0-9._:-]{1,160}$'
     or p_stable_nonce is null or p_stable_nonce !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'invalid starter delivery identity' using errcode = '22023';
  end if;
  select * into conversation_row
  from public.chat_conversations
  where id = p_conversation_id
  for update;
  if not found then
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;
  now_at := clock_timestamp();
  if conversation_row.discord_thread_lease_token is distinct from p_thread_lease_token
     or conversation_row.discord_thread_lease_expires_at <= now_at then
    raise exception 'delivery lease is no longer held' using errcode = 'P0007';
  end if;
  if (conversation_row.discord_starter_reference is not null
      and conversation_row.discord_starter_reference <> p_stable_reference)
     or (conversation_row.discord_starter_nonce is not null
      and conversation_row.discord_starter_nonce <> p_stable_nonce) then
    raise exception 'starter delivery identity conflict' using errcode = 'P0005';
  end if;
  if conversation_row.discord_starter_reference is null then
    update public.chat_conversations
    set discord_starter_reference = p_stable_reference,
        discord_starter_nonce = p_stable_nonce
    where id = conversation_row.id
    returning * into conversation_row;
  end if;
  return conversation_row;
end;
$$;

create or replace function public.claim_chat_starter_delivery(
  p_conversation_id uuid,
  p_thread_lease_token uuid,
  p_claim_token uuid,
  p_lease_seconds integer
)
returns public.chat_conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_row public.chat_conversations;
  now_at timestamptz;
begin
  if p_conversation_id is null or p_thread_lease_token is null or p_claim_token is null
     or p_lease_seconds not between 1 and 300 then
    raise exception 'invalid starter delivery claim' using errcode = '22023';
  end if;
  select * into conversation_row
  from public.chat_conversations
  where id = p_conversation_id
  for update;
  if not found then
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;
  now_at := clock_timestamp();
  if conversation_row.discord_thread_lease_token is distinct from p_thread_lease_token
     or conversation_row.discord_thread_lease_expires_at <= now_at then
    raise exception 'delivery lease is no longer held' using errcode = 'P0007';
  end if;
  if conversation_row.discord_starter_state = 'sent'
     and conversation_row.discord_starter_message_id is not null then
    return conversation_row;
  end if;
  if conversation_row.discord_starter_state = 'uncertain' then
    raise exception 'uncertain starter delivery requires reconciliation' using errcode = 'P0007';
  end if;
  if conversation_row.discord_starter_state = 'claimed' then
    if conversation_row.discord_starter_claim_expires_at > now_at then
      raise exception 'starter delivery claim is already held' using errcode = 'P0007';
    end if;
    -- An expired claim may have reached Discord.  It is never reset to fresh
    -- pending; force an explicit reconciliation path instead.
    update public.chat_conversations
    set discord_starter_state = 'uncertain',
        discord_starter_claim_token = null,
        discord_starter_claim_expires_at = null,
        discord_starter_failure_code = 'lease_expired',
        discord_starter_next_retry_at = null
    where id = conversation_row.id
    returning * into conversation_row;
    -- Return the durable uncertain state so the UPDATE commits.  Callers must
    -- use claim_uncertain_chat_starter_delivery before reconciliation; this
    -- path never hands an expired claim back as fresh pending work.
    return conversation_row;
  end if;
  if conversation_row.discord_starter_state = 'failed'
     and conversation_row.discord_starter_next_retry_at is not null
     and conversation_row.discord_starter_next_retry_at > now_at then
    raise exception 'starter delivery is waiting for retry' using errcode = 'P0007';
  end if;
  if conversation_row.discord_starter_attempt_count >= 20 then
    raise exception 'starter delivery attempts exhausted' using errcode = 'P0010';
  end if;

  update public.chat_conversations
  set discord_starter_state = 'claimed',
      discord_starter_claim_token = p_claim_token,
      discord_starter_claim_expires_at = now_at + pg_catalog.make_interval(secs => p_lease_seconds),
      discord_starter_attempt_count = discord_starter_attempt_count + 1,
      discord_starter_failure_code = null,
      discord_starter_next_retry_at = null
  where id = conversation_row.id
  returning * into conversation_row;
  return conversation_row;
end;
$$;

create or replace function public.claim_uncertain_chat_starter_delivery(
  p_conversation_id uuid,
  p_thread_lease_token uuid,
  p_claim_token uuid,
  p_lease_seconds integer
)
returns public.chat_conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_row public.chat_conversations;
  now_at timestamptz;
begin
  if p_conversation_id is null or p_thread_lease_token is null or p_claim_token is null
     or p_lease_seconds not between 1 and 300 then
    raise exception 'invalid starter reconciliation claim' using errcode = '22023';
  end if;
  select * into conversation_row from public.chat_conversations where id = p_conversation_id for update;
  if not found then raise exception 'chat conversation was not found' using errcode = 'P0002'; end if;
  now_at := clock_timestamp();
  if conversation_row.discord_thread_lease_token is distinct from p_thread_lease_token
     or conversation_row.discord_thread_lease_expires_at <= now_at then
    raise exception 'delivery lease is no longer held' using errcode = 'P0007';
  end if;
  if conversation_row.discord_starter_state <> 'uncertain' then
    raise exception 'starter delivery is not uncertain' using errcode = 'P0007';
  end if;
  update public.chat_conversations
  set discord_starter_state = 'claimed',
      discord_starter_claim_token = p_claim_token,
      discord_starter_claim_expires_at = now_at + pg_catalog.make_interval(secs => p_lease_seconds)
  where id = conversation_row.id
  returning * into conversation_row;
  return conversation_row;
end;
$$;

create or replace function public.finish_chat_starter_delivery(
  p_conversation_id uuid,
  p_thread_lease_token uuid,
  p_claim_token uuid,
  p_outcome text,
  p_starter_message_id text,
  p_failure_code text,
  p_next_retry_at timestamptz
)
returns public.chat_conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_row public.chat_conversations;
  now_at timestamptz;
begin
  if p_conversation_id is null or p_thread_lease_token is null or p_claim_token is null
     or p_outcome not in ('sent', 'uncertain', 'failed')
     or (p_starter_message_id is not null and p_starter_message_id !~ '^[0-9]{1,30}$')
     or (p_failure_code is not null and not public.chat_safe_retry_code(p_failure_code)) then
    raise exception 'invalid starter delivery completion' using errcode = '22023';
  end if;
  if p_outcome = 'sent' and p_starter_message_id is null then
    raise exception 'sent starter delivery requires an id' using errcode = '22023';
  end if;
  if p_outcome = 'failed' and (p_failure_code is null or p_next_retry_at is null) then
    raise exception 'failed starter delivery requires a retry code and time' using errcode = '22023';
  end if;
  select * into conversation_row from public.chat_conversations where id = p_conversation_id for update;
  if not found then raise exception 'chat conversation was not found' using errcode = 'P0002'; end if;
  now_at := clock_timestamp();
  if conversation_row.discord_thread_lease_token is distinct from p_thread_lease_token
     or conversation_row.discord_thread_lease_expires_at <= now_at
     or conversation_row.discord_starter_state <> 'claimed'
     or conversation_row.discord_starter_claim_token is distinct from p_claim_token
     or conversation_row.discord_starter_claim_expires_at <= now_at then
    raise exception 'starter delivery lease is no longer held' using errcode = 'P0007';
  end if;

  if p_outcome = 'sent' then
    update public.chat_conversations
    set discord_starter_state = 'sent',
        discord_starter_message_id = coalesce(discord_starter_message_id, p_starter_message_id),
        discord_starter_claim_token = null,
        discord_starter_claim_expires_at = null,
        discord_starter_failure_code = null,
        discord_starter_next_retry_at = null,
        discord_delivery_status = 'sent'
    where id = conversation_row.id;
  elsif p_outcome = 'uncertain' then
    update public.chat_conversations
    set discord_starter_state = 'uncertain',
        discord_starter_claim_token = null,
        discord_starter_claim_expires_at = null,
        discord_starter_failure_code = coalesce(p_failure_code, 'uncertain'),
        discord_starter_next_retry_at = null
    where id = conversation_row.id;
  else
    if p_next_retry_at <= now_at then
      raise exception 'failed starter retry time must be in the future' using errcode = '22023';
    end if;
    update public.chat_conversations
    set discord_starter_state = 'failed',
        discord_starter_claim_token = null,
        discord_starter_claim_expires_at = null,
        discord_starter_failure_code = p_failure_code,
        discord_starter_next_retry_at = p_next_retry_at,
        discord_delivery_status = 'failed'
    where id = conversation_row.id;
  end if;
  select * into conversation_row from public.chat_conversations where id = p_conversation_id;
  return conversation_row;
end;
$$;

create or replace function public.save_chat_thread_id(
  p_conversation_id uuid,
  p_thread_lease_token uuid,
  p_thread_id text
)
returns public.chat_conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_row public.chat_conversations;
  now_at timestamptz;
begin
  if p_conversation_id is null or p_thread_lease_token is null or p_thread_id is null
     or p_thread_id !~ '^[0-9]{1,30}$' then
    raise exception 'invalid thread id' using errcode = '22023';
  end if;
  select * into conversation_row from public.chat_conversations where id = p_conversation_id for update;
  if not found then raise exception 'chat conversation was not found' using errcode = 'P0002'; end if;
  now_at := clock_timestamp();
  if conversation_row.discord_thread_lease_token is distinct from p_thread_lease_token
     or conversation_row.discord_thread_lease_expires_at <= now_at then
    raise exception 'delivery lease is no longer held' using errcode = 'P0007';
  end if;
  if conversation_row.discord_starter_message_id is null
     or p_thread_id <> conversation_row.discord_starter_message_id then
    raise exception 'thread id must equal the starter message id' using errcode = 'P0005';
  end if;
  if conversation_row.discord_thread_id is not null then
    if conversation_row.discord_thread_id = p_thread_id then return conversation_row; end if;
    raise exception 'thread id conflict' using errcode = 'P0005';
  end if;
  update public.chat_conversations
  set discord_thread_id = p_thread_id
  where id = conversation_row.id
  returning * into conversation_row;
  return conversation_row;
end;
$$;

revoke all on function public.claim_chat_thread_lease(uuid, uuid, integer) from public, anon, authenticated, service_role;
grant execute on function public.claim_chat_thread_lease(uuid, uuid, integer) to service_role;
revoke all on function public.release_chat_thread_lease(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.release_chat_thread_lease(uuid, uuid) to service_role;
revoke all on function public.prepare_chat_starter_delivery(uuid, uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function public.prepare_chat_starter_delivery(uuid, uuid, text, text) to service_role;
revoke all on function public.claim_chat_starter_delivery(uuid, uuid, uuid, integer) from public, anon, authenticated, service_role;
grant execute on function public.claim_chat_starter_delivery(uuid, uuid, uuid, integer) to service_role;
revoke all on function public.claim_uncertain_chat_starter_delivery(uuid, uuid, uuid, integer) from public, anon, authenticated, service_role;
grant execute on function public.claim_uncertain_chat_starter_delivery(uuid, uuid, uuid, integer) to service_role;
revoke all on function public.finish_chat_starter_delivery(uuid, uuid, uuid, text, text, text, timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.finish_chat_starter_delivery(uuid, uuid, uuid, text, text, text, timestamptz) to service_role;
revoke all on function public.save_chat_thread_id(uuid, uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.save_chat_thread_id(uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Durable message-part preparation, claim, reconciliation, and finish
-- ---------------------------------------------------------------------------

create or replace function public.prepare_chat_message_parts(
  p_message_id uuid,
  p_parts jsonb
)
returns setof public.chat_message_parts
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_row public.chat_messages;
  part_row public.chat_message_parts;
  item jsonb;
  part_index_value integer;
  part_count_value integer;
  reference_value text;
  nonce_value text;
  seen_indices integer[] := '{}'::integer[];
begin
  if p_message_id is null or p_parts is null or jsonb_typeof(p_parts) <> 'array'
     or jsonb_array_length(p_parts) < 1 or jsonb_array_length(p_parts) > 20 then
    raise exception 'invalid message parts' using errcode = '22023';
  end if;
  select * into message_row from public.chat_messages where id = p_message_id for update;
  if not found then raise exception 'chat message was not found' using errcode = 'P0002'; end if;
  part_count_value := jsonb_array_length(p_parts);

  for item in select value from jsonb_array_elements(p_parts) loop
    if jsonb_typeof(item) <> 'object'
       or not (item ? 'part_index')
       or not (item ? 'stable_reference')
       or not (item ? 'stable_nonce')
       or (item->>'part_index') !~ '^[0-9]{1,2}$' then
      raise exception 'invalid message parts' using errcode = '22023';
    end if;
    part_index_value := (item->>'part_index')::integer;
    reference_value := item->>'stable_reference';
    nonce_value := item->>'stable_nonce';
    if part_index_value < 0 or part_index_value >= part_count_value
       or part_index_value = any(seen_indices)
       or reference_value is null or reference_value !~ '^[A-Za-z0-9._:-]{1,160}$'
       or nonce_value is null or nonce_value !~ '^[A-Za-z0-9_-]{16,128}$' then
      raise exception 'invalid message parts' using errcode = '22023';
    end if;
    seen_indices := array_append(seen_indices, part_index_value);
    select * into part_row
    from public.chat_message_parts
    where message_id = p_message_id and part_index = part_index_value
    for update;
    if found and (part_row.part_count <> part_count_value
       or part_row.stable_reference <> reference_value
       or part_row.stable_nonce <> nonce_value) then
      raise exception 'message part metadata is immutable' using errcode = 'P0005';
    end if;
  end loop;

  if message_row.delivery_part_count is not null and message_row.delivery_part_count <> part_count_value then
    raise exception 'message part count is immutable' using errcode = 'P0005';
  end if;
  if message_row.delivery_part_count is null then
    update public.chat_messages
    set delivery_part_count = part_count_value
    where id = p_message_id;
  end if;

  for item in select value from jsonb_array_elements(p_parts) loop
    part_index_value := (item->>'part_index')::integer;
    reference_value := item->>'stable_reference';
    nonce_value := item->>'stable_nonce';
    insert into public.chat_message_parts (message_id, part_index, part_count, stable_reference, stable_nonce)
    values (p_message_id, part_index_value, part_count_value, reference_value, nonce_value)
    on conflict (message_id, part_index) do nothing;
  end loop;

  for part_row in
    select * from public.chat_message_parts where message_id = p_message_id order by part_index asc
  loop
    return next part_row;
  end loop;
  return;
exception
  when unique_violation then
    raise exception 'message part metadata conflict' using errcode = 'P0005';
end;
$$;

create or replace function public.chat_claim_part_at(
  p_conversation_id uuid,
  p_conversation_lease_token uuid,
  p_claim_token uuid,
  p_lease_seconds integer,
  p_now timestamptz,
  p_manual_retry boolean
)
returns public.chat_message_parts
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_row public.chat_conversations;
  part_row public.chat_message_parts;
  now_at timestamptz := coalesce(p_now, clock_timestamp());
begin
  if p_conversation_id is null or p_conversation_lease_token is null or p_claim_token is null
     or p_lease_seconds not between 1 and 300 then
    raise exception 'invalid message delivery claim' using errcode = '22023';
  end if;
  select * into conversation_row from public.chat_conversations where id = p_conversation_id for update;
  if not found then raise exception 'chat conversation was not found' using errcode = 'P0002'; end if;
  if conversation_row.discord_thread_lease_token is distinct from p_conversation_lease_token
     or conversation_row.discord_thread_lease_expires_at <= now_at then
    raise exception 'delivery lease is no longer held' using errcode = 'P0007';
  end if;

  -- Expired claims are uncertain, never reset to pending.  A bridge must first
  -- reconcile this part explicitly before any new network send is permitted.
  update public.chat_message_parts p
  set state = 'uncertain',
      claim_token = null,
      lease_expires_at = null,
      failure_code = 'lease_expired',
      next_retry_at = null
  from public.chat_messages m
  where p.message_id = m.id
    and m.conversation_id = p_conversation_id
    and p.state = 'claimed'
    and p.lease_expires_at <= now_at;

  select p.* into part_row
  from public.chat_message_parts p
  join public.chat_messages m on m.id = p.message_id
  where m.conversation_id = p_conversation_id
    and p.attempt_count < 20
    and (
      (p.state = 'pending')
      or (p_manual_retry and p.state = 'failed')
      or (not p_manual_retry and p.state = 'failed'
          and (p.next_retry_at is null or p.next_retry_at <= now_at))
    )
    -- Do not overtake an earlier message, or an earlier part of this message.
    and not exists (
      select 1
      from public.chat_messages prior_message
      where prior_message.conversation_id = m.conversation_id
        and (prior_message.created_at < m.created_at
          or (prior_message.created_at = m.created_at and prior_message.id < m.id))
        and (
          prior_message.delivery_part_count is null
          or exists (
            select 1 from public.chat_message_parts prior_part
            where prior_part.message_id = prior_message.id and prior_part.state <> 'sent'
          )
        )
    )
    and not exists (
      select 1 from public.chat_message_parts prior_part
      where prior_part.message_id = p.message_id
        and prior_part.part_index < p.part_index
        and prior_part.state <> 'sent'
    )
  order by m.created_at asc, m.id asc, p.part_index asc
  for update of p skip locked
  limit 1;

  if not found then return null; end if;
  update public.chat_message_parts
  set state = 'claimed',
      claim_token = p_claim_token,
      lease_expires_at = now_at + pg_catalog.make_interval(secs => p_lease_seconds),
      attempt_count = attempt_count + 1,
      failure_code = null,
      next_retry_at = null
  where id = part_row.id
  returning * into part_row;
  return part_row;
end;
$$;

create or replace function public.claim_next_chat_delivery_part(
  p_conversation_id uuid,
  p_conversation_lease_token uuid,
  p_claim_token uuid,
  p_lease_seconds integer
)
returns public.chat_message_parts
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.chat_claim_part_at(p_conversation_id, p_conversation_lease_token, p_claim_token, p_lease_seconds, null, false);
end;
$$;

create or replace function public.retry_claim_chat_delivery_part(
  p_conversation_id uuid,
  p_conversation_lease_token uuid,
  p_claim_token uuid,
  p_lease_seconds integer
)
returns public.chat_message_parts
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.chat_claim_part_at(p_conversation_id, p_conversation_lease_token, p_claim_token, p_lease_seconds, null, true);
end;
$$;

create or replace function public.claim_uncertain_chat_delivery_part(
  p_conversation_id uuid,
  p_conversation_lease_token uuid,
  p_part_id uuid,
  p_claim_token uuid,
  p_lease_seconds integer
)
returns public.chat_message_parts
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_row public.chat_conversations;
  part_row public.chat_message_parts;
  now_at timestamptz;
begin
  if p_conversation_id is null or p_conversation_lease_token is null or p_part_id is null or p_claim_token is null
     or p_lease_seconds not between 1 and 300 then
    raise exception 'invalid uncertain delivery claim' using errcode = '22023';
  end if;
  select * into conversation_row from public.chat_conversations where id = p_conversation_id for update;
  if not found then raise exception 'chat conversation was not found' using errcode = 'P0002'; end if;
  now_at := clock_timestamp();
  if conversation_row.discord_thread_lease_token is distinct from p_conversation_lease_token
     or conversation_row.discord_thread_lease_expires_at <= now_at then
    raise exception 'delivery lease is no longer held' using errcode = 'P0007';
  end if;
  select p.* into part_row
  from public.chat_message_parts p
  join public.chat_messages m on m.id = p.message_id
  where p.id = p_part_id and m.conversation_id = p_conversation_id
  for update;
  if not found then raise exception 'chat message part was not found' using errcode = 'P0002'; end if;
  if part_row.state <> 'uncertain' then raise exception 'message part is not uncertain' using errcode = 'P0007'; end if;
  update public.chat_message_parts
  set state = 'claimed',
      claim_token = p_claim_token,
      lease_expires_at = now_at + pg_catalog.make_interval(secs => p_lease_seconds)
  where id = part_row.id
  returning * into part_row;
  return part_row;
end;
$$;

create or replace function public.finish_chat_delivery_part(
  p_conversation_id uuid,
  p_conversation_lease_token uuid,
  p_part_id uuid,
  p_claim_token uuid,
  p_outcome text,
  p_discord_message_id text,
  p_failure_code text,
  p_next_retry_at timestamptz
)
returns public.chat_message_parts
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_row public.chat_conversations;
  part_row public.chat_message_parts;
  now_at timestamptz;
begin
  if p_conversation_id is null or p_conversation_lease_token is null or p_part_id is null or p_claim_token is null
     or p_outcome not in ('sent', 'uncertain', 'failed')
     or (p_discord_message_id is not null and p_discord_message_id !~ '^[0-9]{1,30}$')
     or (p_failure_code is not null and not public.chat_safe_retry_code(p_failure_code)) then
    raise exception 'invalid message delivery completion' using errcode = '22023';
  end if;
  if p_outcome = 'sent' and p_discord_message_id is null then
    raise exception 'sent message delivery requires an id' using errcode = '22023';
  end if;
  if p_outcome = 'failed' and (p_failure_code is null or p_next_retry_at is null) then
    raise exception 'failed message delivery requires a retry code and time' using errcode = '22023';
  end if;
  select * into conversation_row from public.chat_conversations where id = p_conversation_id for update;
  if not found then raise exception 'chat conversation was not found' using errcode = 'P0002'; end if;
  now_at := clock_timestamp();
  if conversation_row.discord_thread_lease_token is distinct from p_conversation_lease_token
     or conversation_row.discord_thread_lease_expires_at <= now_at then
    raise exception 'delivery lease is no longer held' using errcode = 'P0007';
  end if;
  select p.* into part_row
  from public.chat_message_parts p
  join public.chat_messages m on m.id = p.message_id
  where p.id = p_part_id and m.conversation_id = p_conversation_id
  for update;
  if not found then raise exception 'chat message part was not found' using errcode = 'P0002'; end if;
  if part_row.state <> 'claimed' or part_row.claim_token is distinct from p_claim_token
     or part_row.lease_expires_at <= now_at then
    raise exception 'message delivery lease is no longer held' using errcode = 'P0007';
  end if;

  if p_outcome = 'sent' then
    update public.chat_message_parts
    set state = 'sent', discord_message_id = coalesce(discord_message_id, p_discord_message_id),
        claim_token = null, lease_expires_at = null, failure_code = null, next_retry_at = null
    where id = part_row.id;
  elsif p_outcome = 'uncertain' then
    update public.chat_message_parts
    set state = 'uncertain', claim_token = null, lease_expires_at = null,
        failure_code = coalesce(p_failure_code, 'uncertain'), next_retry_at = null
    where id = part_row.id;
  else
    if p_next_retry_at <= now_at then
      raise exception 'failed message retry time must be in the future' using errcode = '22023';
    end if;
    update public.chat_message_parts
    set state = 'failed', claim_token = null, lease_expires_at = null,
        failure_code = p_failure_code, next_retry_at = p_next_retry_at
    where id = part_row.id;
  end if;
  select * into part_row from public.chat_message_parts where id = p_part_id;
  return part_row;
end;
$$;

-- Bounded recovery enumeration covers every persistence boundary: a message
-- inserted before part preparation, a failed/uncertain part, an expired claim,
-- and starter work.  It contains identifiers/state only, never message text.
create or replace function public.list_chat_delivery_work_candidates(
  p_limit integer
)
returns table (
  conversation_id uuid,
  message_id uuid,
  part_id uuid,
  work_kind text,
  state text,
  attempt_count integer,
  next_retry_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  with now_value as (select clock_timestamp() as now_at),
  candidates as (
    select c.id as conversation_id,
           null::uuid as message_id,
           null::uuid as part_id,
           case when c.discord_starter_state = 'uncertain'
                     or (c.discord_starter_state = 'claimed' and c.discord_starter_claim_expires_at <= n.now_at)
                then 'starter_reconcile' else 'starter' end as work_kind,
           c.discord_starter_state as state,
           c.discord_starter_attempt_count as attempt_count,
           c.discord_starter_next_retry_at as next_retry_at,
           c.created_at as order_created_at,
           c.id as order_id
    from public.chat_conversations c
    cross join now_value n
    where c.discord_starter_message_id is null
      and c.discord_starter_attempt_count < 20
      and (
        c.discord_starter_state in ('uncertain')
        or (c.discord_starter_state = 'claimed' and c.discord_starter_claim_expires_at <= n.now_at)
        or (c.discord_starter_state = 'pending')
        or (c.discord_starter_state = 'failed'
            and (c.discord_starter_next_retry_at is null or c.discord_starter_next_retry_at <= n.now_at))
      )
    union all
    select m.conversation_id,
           m.id as message_id,
           null::uuid as part_id,
           'message_prepare' as work_kind,
           m.delivery_status as state,
           m.delivery_attempts as attempt_count,
           null::timestamptz as next_retry_at,
           m.created_at as order_created_at,
           m.id as order_id
    from public.chat_messages m
    cross join now_value n
    where m.delivery_part_count is null
      and m.delivery_attempts < 20
      and (
        m.delivery_status = 'pending'
        or (m.delivery_status = 'failed'
            and (m.last_delivery_attempt_at is null or m.last_delivery_attempt_at <= n.now_at))
      )
    union all
    select m.conversation_id,
           m.id as message_id,
           p.id as part_id,
           case when p.state = 'uncertain'
                     or (p.state = 'claimed' and p.lease_expires_at <= n.now_at)
                then 'part_reconcile' else 'part' end as work_kind,
           p.state,
           p.attempt_count,
           p.next_retry_at,
           m.created_at as order_created_at,
           m.id as order_id
    from public.chat_message_parts p
    join public.chat_messages m on m.id = p.message_id
    cross join now_value n
    where (
      p.state = 'uncertain'
      or (p.state = 'claimed' and p.lease_expires_at <= n.now_at)
      or (p.state = 'pending' and p.attempt_count < 20)
      or (p.state = 'failed' and p.attempt_count < 20
          and (p.next_retry_at is null or p.next_retry_at <= n.now_at))
    )
  )
  select conversation_id, message_id, part_id, work_kind, state, attempt_count, next_retry_at
  from candidates
  order by order_created_at asc, order_id asc, part_id asc nulls first
  limit least(greatest(coalesce(p_limit, 1), 1), 100);
$$;

revoke all on function public.prepare_chat_message_parts(uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.prepare_chat_message_parts(uuid, jsonb) to service_role;
revoke all on function public.chat_claim_part_at(uuid, uuid, uuid, integer, timestamptz, boolean) from public, anon, authenticated, service_role;
revoke all on function public.claim_next_chat_delivery_part(uuid, uuid, uuid, integer) from public, anon, authenticated, service_role;
grant execute on function public.claim_next_chat_delivery_part(uuid, uuid, uuid, integer) to service_role;
revoke all on function public.retry_claim_chat_delivery_part(uuid, uuid, uuid, integer) from public, anon, authenticated, service_role;
grant execute on function public.retry_claim_chat_delivery_part(uuid, uuid, uuid, integer) to service_role;
revoke all on function public.claim_uncertain_chat_delivery_part(uuid, uuid, uuid, uuid, integer) from public, anon, authenticated, service_role;
grant execute on function public.claim_uncertain_chat_delivery_part(uuid, uuid, uuid, uuid, integer) to service_role;
revoke all on function public.finish_chat_delivery_part(uuid, uuid, uuid, uuid, text, text, text, timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.finish_chat_delivery_part(uuid, uuid, uuid, uuid, text, text, text, timestamptz) to service_role;
revoke all on function public.list_chat_delivery_work_candidates(integer) from public, anon, authenticated, service_role;
grant execute on function public.list_chat_delivery_work_candidates(integer) to service_role;

-- ---------------------------------------------------------------------------
-- Retention preparation and cleanup queue lifecycle
-- ---------------------------------------------------------------------------

create or replace function public.prepare_chat_retention_cleanup(
  p_guild_id text,
  p_parent_channel_id text,
  p_cutoff timestamptz,
  p_limit integer
)
returns setof public.chat_cleanup_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_row public.chat_conversations;
  cleanup_row public.chat_cleanup_jobs;
  now_at timestamptz := clock_timestamp();
begin
  if p_guild_id is null or p_guild_id !~ '^[0-9]{1,30}$'
     or p_parent_channel_id is null or p_parent_channel_id !~ '^[0-9]{1,30}$'
     or p_cutoff is null or p_limit not between 1 and 100 then
    raise exception 'invalid retention cleanup request' using errcode = '22023';
  end if;
  if p_cutoff > now_at - interval '30 days' then
    raise exception 'retention cutoff is not old enough' using errcode = '22023';
  end if;

  for conversation_row in
    select c.*
    from public.chat_conversations c
    where c.status in ('closed', 'spam')
      and c.terminal_at < p_cutoff
      and not exists (
        select 1 from public.chat_cleanup_jobs existing_job
        where existing_job.conversation_id = c.id
      )
    order by c.terminal_at asc, c.id asc
    limit p_limit
    for update skip locked
  loop
    -- Conversation delivery writers take this same conversation lock before
    -- touching part leases, so these checks remain atomic with deletion.
    if conversation_row.discord_thread_lease_token is not null
       and conversation_row.discord_thread_lease_expires_at > now_at then
      continue;
    end if;
    if exists (
      select 1
      from public.chat_message_parts part_row
      join public.chat_messages message_row on message_row.id = part_row.message_id
      where message_row.conversation_id = conversation_row.id
        and part_row.state = 'claimed'
        and part_row.lease_expires_at > now_at
    ) then
      continue;
    end if;

    insert into public.chat_cleanup_jobs (
      conversation_id,
      guild_id,
      parent_channel_id,
      starter_message_id,
      thread_id,
      state,
      attempt_count
    ) values (
      conversation_row.id,
      p_guild_id,
      p_parent_channel_id,
      conversation_row.discord_starter_message_id,
      conversation_row.discord_thread_id,
      'pending',
      0
    )
    returning * into cleanup_row;

    -- The cleanup row has no FK to the conversation on purpose: it is the
    -- body-free durable record that survives this cascading transcript delete.
    delete from public.chat_conversations where id = conversation_row.id;
    return next cleanup_row;
  end loop;
  return;
end;
$$;

create or replace function public.claim_chat_cleanup_job(
  p_job_id uuid,
  p_claim_token uuid,
  p_lease_seconds integer
)
returns public.chat_cleanup_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleanup_row public.chat_cleanup_jobs;
  now_at timestamptz;
begin
  if p_job_id is null or p_claim_token is null or p_lease_seconds not between 1 and 300 then
    raise exception 'invalid cleanup claim' using errcode = '22023';
  end if;
  select * into cleanup_row from public.chat_cleanup_jobs where id = p_job_id for update;
  if not found then raise exception 'cleanup job was not found' using errcode = 'P0002'; end if;
  now_at := clock_timestamp();
  if cleanup_row.state = 'claimed' then
    if cleanup_row.lease_expires_at > now_at then
      raise exception 'cleanup lease is already held' using errcode = 'P0007';
    end if;
    update public.chat_cleanup_jobs
    set state = 'uncertain', claim_token = null, lease_expires_at = null,
        failure_code = 'lease_expired', next_retry_at = null
    where id = cleanup_row.id;
    select * into cleanup_row from public.chat_cleanup_jobs where id = cleanup_row.id;
    -- The caller must explicitly claim the uncertain job for reconciliation;
    -- do not turn an expired external-delete attempt back into pending work.
    return cleanup_row;
  end if;
  if cleanup_row.state = 'uncertain' then
    raise exception 'uncertain cleanup requires reconciliation' using errcode = 'P0007';
  end if;
  if cleanup_row.state not in ('pending', 'failed')
     or (cleanup_row.state = 'failed' and cleanup_row.next_retry_at is not null and cleanup_row.next_retry_at > now_at) then
    raise exception 'cleanup job is not ready' using errcode = 'P0007';
  end if;
  if cleanup_row.attempt_count >= 20 then raise exception 'cleanup attempts exhausted' using errcode = 'P0010'; end if;
  update public.chat_cleanup_jobs
  set state = 'claimed', claim_token = p_claim_token,
      lease_expires_at = now_at + pg_catalog.make_interval(secs => p_lease_seconds),
      attempt_count = attempt_count + 1, failure_code = null, next_retry_at = null
  where id = cleanup_row.id
  returning * into cleanup_row;
  return cleanup_row;
end;
$$;

create or replace function public.claim_uncertain_chat_cleanup_job(
  p_job_id uuid,
  p_claim_token uuid,
  p_lease_seconds integer
)
returns public.chat_cleanup_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleanup_row public.chat_cleanup_jobs;
  now_at timestamptz;
begin
  if p_job_id is null or p_claim_token is null or p_lease_seconds not between 1 and 300 then
    raise exception 'invalid uncertain cleanup claim' using errcode = '22023';
  end if;
  select * into cleanup_row from public.chat_cleanup_jobs where id = p_job_id for update;
  if not found then raise exception 'cleanup job was not found' using errcode = 'P0002'; end if;
  if cleanup_row.state <> 'uncertain' then raise exception 'cleanup job is not uncertain' using errcode = 'P0007'; end if;
  now_at := clock_timestamp();
  update public.chat_cleanup_jobs
  set state = 'claimed', claim_token = p_claim_token,
      lease_expires_at = now_at + pg_catalog.make_interval(secs => p_lease_seconds)
  where id = cleanup_row.id
  returning * into cleanup_row;
  return cleanup_row;
end;
$$;

create or replace function public.finish_chat_cleanup_job(
  p_job_id uuid,
  p_claim_token uuid,
  p_outcome text,
  p_failure_code text,
  p_next_retry_at timestamptz
)
returns public.chat_cleanup_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleanup_row public.chat_cleanup_jobs;
  now_at timestamptz;
begin
  if p_job_id is null or p_claim_token is null or p_outcome not in ('succeeded', 'uncertain', 'failed')
     or (p_failure_code is not null and not public.chat_safe_retry_code(p_failure_code)) then
    raise exception 'invalid cleanup completion' using errcode = '22023';
  end if;
  if p_outcome = 'failed' and (p_failure_code is null or p_next_retry_at is null) then
    raise exception 'failed cleanup requires a retry code and time' using errcode = '22023';
  end if;
  select * into cleanup_row from public.chat_cleanup_jobs where id = p_job_id for update;
  if not found then raise exception 'cleanup job was not found' using errcode = 'P0002'; end if;
  now_at := clock_timestamp();
  if cleanup_row.state <> 'claimed'
     or cleanup_row.claim_token is distinct from p_claim_token
     or cleanup_row.lease_expires_at <= now_at then
    raise exception 'cleanup lease is no longer held' using errcode = 'P0007';
  end if;
  if p_outcome = 'succeeded' then
    update public.chat_cleanup_jobs
    set state = 'succeeded', claim_token = null, lease_expires_at = null,
        failure_code = null, next_retry_at = null, completed_at = now_at
    where id = cleanup_row.id;
  elsif p_outcome = 'uncertain' then
    update public.chat_cleanup_jobs
    set state = 'uncertain', claim_token = null, lease_expires_at = null,
        failure_code = coalesce(p_failure_code, 'uncertain'), next_retry_at = null
    where id = cleanup_row.id;
  else
    if p_next_retry_at <= now_at then raise exception 'failed cleanup retry time must be in the future' using errcode = '22023'; end if;
    update public.chat_cleanup_jobs
    set state = 'failed', claim_token = null, lease_expires_at = null,
        failure_code = p_failure_code, next_retry_at = p_next_retry_at
    where id = cleanup_row.id;
  end if;
  select * into cleanup_row from public.chat_cleanup_jobs where id = p_job_id;
  return cleanup_row;
end;
$$;

revoke all on function public.prepare_chat_retention_cleanup(text, text, timestamptz, integer) from public, anon, authenticated, service_role;
grant execute on function public.prepare_chat_retention_cleanup(text, text, timestamptz, integer) to service_role;
revoke all on function public.claim_chat_cleanup_job(uuid, uuid, integer) from public, anon, authenticated, service_role;
grant execute on function public.claim_chat_cleanup_job(uuid, uuid, integer) to service_role;
revoke all on function public.claim_uncertain_chat_cleanup_job(uuid, uuid, integer) from public, anon, authenticated, service_role;
grant execute on function public.claim_uncertain_chat_cleanup_job(uuid, uuid, integer) to service_role;
revoke all on function public.finish_chat_cleanup_job(uuid, uuid, text, text, timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.finish_chat_cleanup_job(uuid, uuid, text, text, timestamptz) to service_role;
