-- Chat backend forward migration: configuration-era queue leases and
-- idempotent visitor writes.
--
-- Existing chat migrations are intentionally left unchanged. Browser roles
-- still receive no table access; these RPCs are the only new write boundary
-- and are callable by service_role only.

-- ---------------------------------------------------------------------------
-- Same-Pacific-day queue leases and visitor idempotency keys
-- ---------------------------------------------------------------------------

alter table public.chat_queue_state
  add column if not exists queue_expires_at timestamptz;

-- A legacy manually-open row has no lease and therefore must not remain live.
-- Keep the update fail-closed and leave rows that already carry an explicit
-- lease for the availability/RPC validators below.
update public.chat_queue_state
set queue_open = false,
    queue_expires_at = null
where queue_open = true
  and queue_expires_at is null;

alter table public.chat_queue_state
  drop constraint if exists chat_queue_state_expiry_format;
alter table public.chat_queue_state
  add constraint chat_queue_state_expiry_format
  check (queue_expires_at is null or queue_expires_at > updated_at);

alter table public.chat_messages
  add column if not exists client_message_id uuid;

create unique index if not exists chat_messages_conversation_client_message_key
  on public.chat_messages (conversation_id, client_message_id)
  where client_message_id is not null;

create index if not exists chat_queue_state_expiry_idx
  on public.chat_queue_state (queue_expires_at)
  where queue_open = true and queue_expires_at is not null;

-- ---------------------------------------------------------------------------
-- Atomic visitor conversation creation
-- ---------------------------------------------------------------------------

create or replace function public.insert_chat_visitor_conversation(
  p_visitor_token_digest text,
  p_display_name text,
  p_email text,
  p_is_under_13 boolean,
  p_guardian_attested boolean
)
returns table (
  id uuid,
  display_name text,
  email text,
  is_under_13 boolean,
  guardian_attested boolean,
  status text,
  ownership_expires_at timestamptz,
  terminal_at timestamptz,
  discord_thread_id text,
  discord_delivery_status text,
  created_at timestamptz,
  updated_at timestamptz,
  resumed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  queue_row public.chat_queue_state;
  conversation_row public.chat_conversations;
  now_at timestamptz;
  local_at timestamp without time zone;
begin
  if p_visitor_token_digest is null
     or p_visitor_token_digest !~ '^[0-9a-f]{64}$'
     or p_display_name is null
     or char_length(btrim(p_display_name)) not between 1 and 160
     or position('<' in p_display_name) > 0
     or position('>' in p_display_name) > 0
     or p_email is null
     or char_length(p_email) > 320
     or position('<' in p_email) > 0
     or position('>' in p_email) > 0
     or p_is_under_13 is null
     or p_guardian_attested is null then
    raise exception 'invalid chat conversation' using errcode = '22023';
  end if;

  -- Under-13 visitors must use a separate parent/guardian flow. A checkbox
  -- alone is not an independent visitor authorization.
  if p_is_under_13 then
    raise exception 'under-13 chat requires a parent or guardian'
      using errcode = 'P0004';
  end if;

  -- All visitor writers lock the singleton first. This is the same lock order
  -- used by the message RPC and lets a queue close serialize with creation.
  select * into queue_row
  from public.chat_queue_state
  where singleton_key = 'default'
  for update;
  if not found then
    raise exception 'chat is closed' using errcode = 'P0003';
  end if;

  -- Serialize same-token retries while the queue row is held. A missing row is
  -- also safe because the queue singleton serializes all calls to this RPC.
  select * into conversation_row
  from public.chat_conversations
  where visitor_token_digest = p_visitor_token_digest
  for update;

  now_at := clock_timestamp();
  local_at := now_at at time zone 'America/Los_Angeles';
  if queue_row.queue_open is distinct from true
     or queue_row.queue_expires_at is null
     or queue_row.queue_expires_at <= now_at
     or (queue_row.queue_expires_at at time zone 'America/Los_Angeles')::date <> local_at::date
     or (queue_row.queue_expires_at at time zone 'America/Los_Angeles')::time <> time '22:00'
     or extract(isodow from local_at)::integer not between 1 and 5
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
    raise exception 'chat is closed' using errcode = 'P0003';
  end if;

  if found then
    if conversation_row.status = 'open'
       and conversation_row.ownership_expires_at > now_at then
      return query select
        conversation_row.id,
        conversation_row.display_name,
        conversation_row.email,
        conversation_row.is_under_13,
        conversation_row.guardian_attested,
        conversation_row.status,
        conversation_row.ownership_expires_at,
        conversation_row.terminal_at,
        conversation_row.discord_thread_id,
        conversation_row.discord_delivery_status,
        conversation_row.created_at,
        conversation_row.updated_at,
        true;
      return;
    end if;

    -- The digest is intentionally unique for the token lifetime. Do not
    -- recycle an expired/terminal row in place: that would blur ownership and
    -- violate terminal transcript retention semantics. The client can submit
    -- a fresh nonce to obtain a new token/digest.
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;

  insert into public.chat_conversations (
    visitor_token_digest,
    display_name,
    email,
    is_under_13,
    guardian_attested,
    status,
    ownership_expires_at,
    terminal_at,
    discord_delivery_status,
    created_at,
    updated_at
  ) values (
    p_visitor_token_digest,
    btrim(p_display_name),
    btrim(p_email),
    false,
    p_guardian_attested,
    'open',
    now_at + pg_catalog.make_interval(days => 30),
    null,
    'pending',
    now_at,
    now_at
  )
  returning * into conversation_row;

  return query select
    conversation_row.id,
    conversation_row.display_name,
    conversation_row.email,
    conversation_row.is_under_13,
    conversation_row.guardian_attested,
    conversation_row.status,
    conversation_row.ownership_expires_at,
    conversation_row.terminal_at,
    conversation_row.discord_thread_id,
    conversation_row.discord_delivery_status,
    conversation_row.created_at,
    conversation_row.updated_at,
    false;
end;
$$;

-- ---------------------------------------------------------------------------
-- Atomic visitor message send with conversation-scoped idempotency
-- ---------------------------------------------------------------------------

create or replace function public.insert_chat_visitor_message(
  p_conversation_id uuid,
  p_visitor_token_digest text,
  p_client_message_id uuid,
  p_body text
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
  local_at timestamp without time zone;
begin
  if p_conversation_id is null
     or p_visitor_token_digest is null
     or p_visitor_token_digest !~ '^[0-9a-f]{64}$'
     or p_client_message_id is null
     or p_body is null
     or char_length(btrim(p_body)) not between 1 and 4000
     or position('<' in p_body) > 0
     or position('>' in p_body) > 0 then
    raise exception 'invalid chat message' using errcode = '22023';
  end if;

  -- Keep queue then conversation lock order stable with conversation creation
  -- and every future queue-close writer.
  select * into queue_row
  from public.chat_queue_state
  where singleton_key = 'default'
  for update;
  if not found then
    raise exception 'chat is closed' using errcode = 'P0003';
  end if;

  select * into conversation_row
  from public.chat_conversations
  where id = p_conversation_id
  for update;
  if not found or conversation_row.visitor_token_digest <> p_visitor_token_digest then
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;

  now_at := clock_timestamp();
  if conversation_row.ownership_expires_at <= now_at then
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;

  -- Replay is resolved after ownership/conversation locking but before the
  -- current-hour gate. A network retry therefore returns the exact original
  -- row even if the queue closes between attempts.
  select * into message_row
  from public.chat_messages
  where conversation_id = conversation_row.id
    and client_message_id = p_client_message_id
  for update;
  if found then
    if message_row.sender = 'visitor' and message_row.body = btrim(p_body) then
      return message_row;
    end if;
    raise exception 'client message id already has a different body'
      using errcode = 'P0005';
  end if;

  local_at := now_at at time zone 'America/Los_Angeles';
  if queue_row.queue_open is distinct from true
     or queue_row.queue_expires_at is null
     or queue_row.queue_expires_at <= now_at
     or (queue_row.queue_expires_at at time zone 'America/Los_Angeles')::date <> local_at::date
     or (queue_row.queue_expires_at at time zone 'America/Los_Angeles')::time <> time '22:00'
     or extract(isodow from local_at)::integer not between 1 and 5
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
    raise exception 'chat is closed' using errcode = 'P0003';
  end if;
  if conversation_row.status <> 'open' then
    raise exception 'chat is closed' using errcode = 'P0003';
  end if;

  insert into public.chat_messages (
    conversation_id,
    client_message_id,
    sender,
    body,
    delivery_status,
    delivery_attempts,
    created_at,
    updated_at
  ) values (
    conversation_row.id,
    p_client_message_id,
    'visitor',
    btrim(p_body),
    'pending',
    0,
    now_at,
    now_at
  )
  returning * into message_row;

  return message_row;
exception
  when unique_violation then
    -- The unique scoped key is a last-resort serialization point for a
    -- concurrent caller that arrived after the row lookup. Return only the
    -- same-body row; never turn a conflicting body into success.
    select * into message_row
    from public.chat_messages
    where conversation_id = p_conversation_id
      and client_message_id = p_client_message_id
    for update;
    if found and message_row.sender = 'visitor' and message_row.body = btrim(p_body) then
      return message_row;
    end if;
    raise exception 'client message id already has a different body'
      using errcode = 'P0005';
end;
$$;

-- Preserve the old three-argument symbol for already-deployed server code.
-- It retains the same queue/conversation lock and time checks (the existing
-- SQL contract inspects those properties) while assigning a fresh key. New
-- callers must use the four-argument form and supply their client key.
create or replace function public.insert_chat_visitor_message(
  p_conversation_id uuid,
  p_visitor_token_digest text,
  p_body text
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
  local_at timestamp without time zone;
begin
  if p_conversation_id is null
     or p_visitor_token_digest is null
     or p_visitor_token_digest !~ '^[0-9a-f]{64}$'
     or p_body is null
     or char_length(btrim(p_body)) not between 1 and 4000
     or position('<' in p_body) > 0
     or position('>' in p_body) > 0 then
    raise exception 'invalid chat message' using errcode = '22023';
  end if;

  select * into queue_row
  from public.chat_queue_state
  where singleton_key = 'default'
  for update;
  if not found or queue_row.queue_open is distinct from true then
    raise exception 'chat is closed' using errcode = 'P0003';
  end if;

  select * into conversation_row
  from public.chat_conversations
  where id = p_conversation_id
  for update;
  if not found or conversation_row.visitor_token_digest <> p_visitor_token_digest then
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;

  now_at := clock_timestamp();
  local_at := now_at at time zone 'America/Los_Angeles';
  if queue_row.queue_open is distinct from true
     or extract(isodow from local_at)::integer not between 1 and 5
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
    raise exception 'chat is closed' using errcode = 'P0003';
  end if;
  if conversation_row.ownership_expires_at <= now_at then
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;
  if conversation_row.status <> 'open' then
    raise exception 'chat is closed' using errcode = 'P0003';
  end if;

  insert into public.chat_messages (
    conversation_id,
    client_message_id,
    sender,
    body,
    delivery_status,
    delivery_attempts
  ) values (
    conversation_row.id,
    gen_random_uuid(),
    'visitor',
    btrim(p_body),
    'pending',
    0
  )
  returning * into message_row;

  return message_row;
end;
$$;

revoke all on function public.insert_chat_visitor_conversation(text, text, text, boolean, boolean)
from public, anon, authenticated, service_role;
grant execute on function public.insert_chat_visitor_conversation(text, text, text, boolean, boolean)
to service_role;

revoke all on function public.insert_chat_visitor_message(uuid, text, uuid, text)
from public, anon, authenticated, service_role;
grant execute on function public.insert_chat_visitor_message(uuid, text, uuid, text)
to service_role;

revoke all on function public.insert_chat_visitor_message(uuid, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.insert_chat_visitor_message(uuid, text, text)
to service_role;
