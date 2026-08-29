-- Task 04A review fixes: atomic visitor sends and retry-safe ownership.
--
-- The route performs a friendly availability read before rate limiting. This
-- service-only RPC is the authoritative persistence-time check: it locks the
-- queue singleton first and the matching conversation second, so queue and
-- conversation closure cannot race an insert. A separate timestamped helper
-- exists only for revoked pgTAP boundary coverage; the production function
-- always obtains its time from the database.

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

  -- Every writer that can close the queue must contend on this row before a
  -- send can proceed. Keep this lock order (queue, then conversation) stable.
  select * into queue_row
  from public.chat_queue_state
  where singleton_key = 'default'
  for update;
  if not found or queue_row.queue_open is distinct from true then
    raise exception 'chat is closed' using errcode = 'P0003';
  end if;

  -- clock_timestamp() is database time evaluated after the queue lock is
  -- acquired, so a waiter cannot use a stale pre-lock transaction timestamp.
  now_at := clock_timestamp();
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
    raise exception 'chat is closed' using errcode = 'P0003';
  end if;

  -- Lock by id before comparing the digest. This both avoids an ownership
  -- oracle and serializes a concurrent conversation close with this insert.
  select * into conversation_row
  from public.chat_conversations
  where id = p_conversation_id
  for update;
  if not found or conversation_row.visitor_token_digest <> p_visitor_token_digest then
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;
  if conversation_row.ownership_expires_at <= now_at then
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;
  if conversation_row.status <> 'open' then
    raise exception 'chat is closed' using errcode = 'P0003';
  end if;

  insert into public.chat_messages (
    conversation_id,
    sender,
    body,
    delivery_status,
    delivery_attempts
  ) values (
    conversation_row.id,
    'visitor',
    p_body,
    'pending',
    0
  )
  returning * into message_row;

  return message_row;
end;
$$;

create or replace function public.chat_test_insert_visitor_message(
  p_conversation_id uuid,
  p_visitor_token_digest text,
  p_body text,
  p_now timestamptz
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
  local_at timestamp without time zone;
begin
  if p_conversation_id is null
     or p_visitor_token_digest is null
     or p_visitor_token_digest !~ '^[0-9a-f]{64}$'
     or p_body is null
     or char_length(btrim(p_body)) not between 1 and 4000
     or position('<' in p_body) > 0
     or position('>' in p_body) > 0
     or p_now is null then
    raise exception 'invalid chat message' using errcode = '22023';
  end if;

  select * into queue_row
  from public.chat_queue_state
  where singleton_key = 'default'
  for update;
  if not found or queue_row.queue_open is distinct from true then
    raise exception 'chat is closed' using errcode = 'P0003';
  end if;

  local_at := p_now at time zone 'America/Los_Angeles';
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
    raise exception 'chat is closed' using errcode = 'P0003';
  end if;

  select * into conversation_row
  from public.chat_conversations
  where id = p_conversation_id
  for update;
  if not found or conversation_row.visitor_token_digest <> p_visitor_token_digest then
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;
  if conversation_row.ownership_expires_at <= p_now then
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;
  if conversation_row.status <> 'open' then
    raise exception 'chat is closed' using errcode = 'P0003';
  end if;

  insert into public.chat_messages (
    conversation_id,
    sender,
    body,
    delivery_status,
    delivery_attempts
  ) values (
    conversation_row.id,
    'visitor',
    p_body,
    'pending',
    0
  )
  returning * into message_row;

  return message_row;
end;
$$;

-- Only the production RPC is callable by the server role. The deterministic
-- helper is intentionally revoked from every API role and has no defaulted
-- arguments or same-name overload to confuse PostgREST resolution.
revoke all on function public.insert_chat_visitor_message(uuid, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.insert_chat_visitor_message(uuid, text, text) to service_role;

revoke all on function public.chat_test_insert_visitor_message(uuid, text, text, timestamptz)
from public, anon, authenticated, service_role;
