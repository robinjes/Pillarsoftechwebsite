-- Task 4B bridge follow-up: keep message and conversation delivery status in
-- sync with the durable starter/part state machines.
--
-- Older migrations are intentionally left untouched.  Every writer below
-- takes the conversation lock first, then message, then part; the bridge can
-- therefore safely call the refresh helper after a fenced finish.

create or replace function public.refresh_chat_delivery_status(
  p_conversation_id uuid
)
returns public.chat_conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_row public.chat_conversations;
  message_row public.chat_messages;
  message_status text;
  part_count integer;
  sent_part_count integer;
  failed_part_count integer;
  has_pending boolean := false;
  has_failed boolean := false;
  aggregate_status text;
begin
  if p_conversation_id is null then
    raise exception 'invalid delivery status refresh' using errcode = '22023';
  end if;

  -- Conversation is the outer lock for every bridge status writer.
  select * into conversation_row
  from public.chat_conversations
  where id = p_conversation_id
  for update;
  if not found then
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;

  if conversation_row.discord_starter_state = 'failed' then
    has_failed := true;
  elsif conversation_row.discord_starter_state <> 'sent'
     or conversation_row.discord_starter_message_id is null then
    has_pending := true;
  end if;

  -- Message rows are locked in deterministic chronological order before any
  -- part state is inspected. This prevents a second bridge worker from
  -- publishing a stale aggregate while a part completion is committed.
  for message_row in
    select m.*
    from public.chat_messages m
    where m.conversation_id = p_conversation_id
    order by m.created_at asc, m.id asc
    for update
  loop
    if message_row.delivery_part_count is null then
      if message_row.delivery_status = 'failed' then
        has_failed := true;
        message_status := 'failed';
      else
        has_pending := true;
        message_status := 'pending';
      end if;
    else
      select count(*)::integer,
             count(*) filter (where p.state = 'sent')::integer,
             count(*) filter (where p.state = 'failed')::integer
      into part_count, sent_part_count, failed_part_count
      from public.chat_message_parts p
      where p.message_id = message_row.id;

      if failed_part_count > 0 then
        message_status := 'failed';
        has_failed := true;
      elsif part_count = message_row.delivery_part_count
        and sent_part_count = message_row.delivery_part_count then
        message_status := 'sent';
      else
        message_status := 'pending';
        has_pending := true;
      end if;
    end if;

    if message_row.delivery_status is distinct from message_status then
      update public.chat_messages
      set delivery_status = message_status,
          delivery_error = case when message_status = 'failed' then delivery_error else null end
      where id = message_row.id;
    end if;
  end loop;

  aggregate_status := case
    when has_failed then 'failed'
    when has_pending then 'pending'
    else 'sent'
  end;
  update public.chat_conversations
  set discord_delivery_status = aggregate_status
  where id = conversation_row.id;

  select * into conversation_row
  from public.chat_conversations
  where id = p_conversation_id;
  return conversation_row;
end;
$$;

revoke all on function public.refresh_chat_delivery_status(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.refresh_chat_delivery_status(uuid) to service_role;

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

  -- Conversation is locked before starter state changes and before aggregate
  -- refresh. The claim token remains the write fence after the network call.
  select * into conversation_row
  from public.chat_conversations
  where id = p_conversation_id
  for update;
  if not found then
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;
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
        discord_starter_next_retry_at = null
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
        discord_starter_next_retry_at = p_next_retry_at
    where id = conversation_row.id;
  end if;

  return public.refresh_chat_delivery_status(p_conversation_id);
end;
$$;

revoke all on function public.finish_chat_starter_delivery(uuid, uuid, uuid, text, text, text, timestamptz)
from public, anon, authenticated, service_role;
grant execute on function public.finish_chat_starter_delivery(uuid, uuid, uuid, text, text, text, timestamptz)
to service_role;

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
  message_row public.chat_messages;
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

  -- Lock order is conversation -> message -> part. A part id is resolved
  -- only after the conversation lease is fenced to prevent cross-conversation
  -- completion and deadlocks with another delivery worker.
  select * into conversation_row
  from public.chat_conversations
  where id = p_conversation_id
  for update;
  if not found then
    raise exception 'chat conversation was not found' using errcode = 'P0002';
  end if;
  now_at := clock_timestamp();
  if conversation_row.discord_thread_lease_token is distinct from p_conversation_lease_token
     or conversation_row.discord_thread_lease_expires_at <= now_at then
    raise exception 'delivery lease is no longer held' using errcode = 'P0007';
  end if;

  select m.* into message_row
  from public.chat_messages m
  join public.chat_message_parts p on p.message_id = m.id
  where p.id = p_part_id and m.conversation_id = p_conversation_id
  for update of m;
  if not found then
    raise exception 'chat message part was not found' using errcode = 'P0002';
  end if;
  select p.* into part_row
  from public.chat_message_parts p
  where p.id = p_part_id
  for update;
  if not found then
    raise exception 'chat message part was not found' using errcode = 'P0002';
  end if;
  -- The message/part locks may have waited behind prepare or another writer.
  -- Sample time only after all required rows are locked and fence both the
  -- outer conversation lease and the part claim against that fresh instant.
  now_at := clock_timestamp();
  if conversation_row.discord_thread_lease_token is distinct from p_conversation_lease_token
     or conversation_row.discord_thread_lease_expires_at <= now_at then
    raise exception 'delivery lease is no longer held' using errcode = 'P0007';
  end if;
  if part_row.state <> 'claimed' or part_row.claim_token is distinct from p_claim_token
     or part_row.lease_expires_at <= now_at then
    raise exception 'message delivery lease is no longer held' using errcode = 'P0007';
  end if;

  if p_outcome = 'sent' then
    update public.chat_message_parts
    set state = 'sent',
        discord_message_id = coalesce(discord_message_id, p_discord_message_id),
        claim_token = null,
        lease_expires_at = null,
        failure_code = null,
        next_retry_at = null
    where id = part_row.id;
  elsif p_outcome = 'uncertain' then
    update public.chat_message_parts
    set state = 'uncertain',
        claim_token = null,
        lease_expires_at = null,
        failure_code = coalesce(p_failure_code, 'uncertain'),
        next_retry_at = null
    where id = part_row.id;
  else
    if p_next_retry_at <= now_at then
      raise exception 'failed message retry time must be in the future' using errcode = '22023';
    end if;
    update public.chat_message_parts
    set state = 'failed',
        claim_token = null,
        lease_expires_at = null,
        failure_code = p_failure_code,
        next_retry_at = p_next_retry_at
    where id = part_row.id;
  end if;

  -- The helper re-locks the same conversation and then all messages in order;
  -- PostgreSQL permits this transaction's already-held row lock.
  perform public.refresh_chat_delivery_status(p_conversation_id);
  select * into part_row from public.chat_message_parts where id = p_part_id;
  return part_row;
end;
$$;

revoke all on function public.finish_chat_delivery_part(uuid, uuid, uuid, uuid, text, text, text, timestamptz)
from public, anon, authenticated, service_role;
grant execute on function public.finish_chat_delivery_part(uuid, uuid, uuid, uuid, text, text, text, timestamptz)
to service_role;

-- A direct delivery attempt must not be starved by older work belonging to
-- other conversations.  Dispatch still uses the global function above to
-- choose conversations, while the per-conversation worker uses this bounded
-- variant after it has acquired that conversation's lease.
create or replace function public.list_chat_delivery_work_candidates_for_conversation(
  p_conversation_id uuid,
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
    where c.id = p_conversation_id
      and c.discord_starter_message_id is null
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
    where m.conversation_id = p_conversation_id
      and m.delivery_part_count is null
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
    where m.conversation_id = p_conversation_id
      and (
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

revoke all on function public.list_chat_delivery_work_candidates_for_conversation(uuid, integer)
from public, anon, authenticated, service_role;
grant execute on function public.list_chat_delivery_work_candidates_for_conversation(uuid, integer)
to service_role;
