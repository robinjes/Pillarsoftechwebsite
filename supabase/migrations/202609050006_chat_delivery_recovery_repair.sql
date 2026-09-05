-- Task 4B recovery repair.
--
-- Migration 005 is already applied in deployed environments, so keep its
-- aggregate/status function intact and replace only the scoped recovery
-- reader.  An uncertain or expired claimed part is another external attempt
-- only while its bounded attempt budget remains; capped rows must not occupy
-- the head of a conversation's work queue forever.

-- Thread creation/repair is also an external delivery attempt.  Keep its
-- bounded state on the conversation so a missing/locked thread or a transient
-- Discord failure cannot cause every poll to issue another GET/POST/PATCH.
alter table public.chat_conversations
  add column if not exists discord_thread_state text not null default 'pending',
  add column if not exists discord_thread_attempt_count integer not null default 0,
  add column if not exists discord_thread_failure_code text,
  add column if not exists discord_thread_next_retry_at timestamptz;

update public.chat_conversations
set discord_thread_state = case when discord_thread_id is null then 'pending' else 'sent' end
where discord_thread_state is null
   or (discord_thread_state = 'pending' and discord_thread_id is not null);

alter table public.chat_conversations
  drop constraint if exists chat_conversations_thread_state_check;
alter table public.chat_conversations
  add constraint chat_conversations_thread_state_check
  check (discord_thread_state in ('pending', 'claimed', 'uncertain', 'sent', 'failed'));

alter table public.chat_conversations
  drop constraint if exists chat_conversations_thread_attempts_bounded;
alter table public.chat_conversations
  add constraint chat_conversations_thread_attempts_bounded
  check (discord_thread_attempt_count between 0 and 20);

alter table public.chat_conversations
  drop constraint if exists chat_conversations_thread_failure_length;
alter table public.chat_conversations
  add constraint chat_conversations_thread_failure_length
  check (discord_thread_failure_code is null or discord_thread_failure_code ~ '^[a-z0-9_:-]{1,64}$');

-- A thread setup claim is fenced by the already-held conversation lease.  A
-- claimed row left by a crashed worker is normalized to uncertain when the
-- next worker acquires that lease; it is never treated as a fresh POST.
create or replace function public.begin_chat_thread_setup(
  p_conversation_id uuid,
  p_thread_lease_token uuid
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
  if p_conversation_id is null or p_thread_lease_token is null then
    raise exception 'invalid thread setup claim' using errcode = '22023';
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

  if conversation_row.discord_thread_state = 'claimed' then
    -- The outer conversation lease is mutually exclusive.  Reaching this
    -- branch after acquiring it means the prior setup worker disappeared;
    -- preserve uncertainty before the new worker performs its invariant GET.
    update public.chat_conversations
    set discord_thread_state = 'uncertain',
        discord_thread_failure_code = 'lease_expired',
        discord_thread_next_retry_at = null
    where id = conversation_row.id
    returning * into conversation_row;
  end if;

  if conversation_row.discord_thread_attempt_count >= 20 then
    raise exception 'thread setup attempts exhausted' using errcode = 'P0010';
  end if;
  if conversation_row.discord_thread_next_retry_at is not null
     and conversation_row.discord_thread_next_retry_at > now_at then
    raise exception 'thread setup is waiting for retry' using errcode = 'P0007';
  end if;
  update public.chat_conversations
  set discord_thread_state = 'claimed',
      discord_thread_attempt_count = discord_thread_attempt_count + 1,
      discord_thread_failure_code = null,
      discord_thread_next_retry_at = null
  where id = conversation_row.id
  returning * into conversation_row;
  return conversation_row;
end;
$$;

revoke all on function public.begin_chat_thread_setup(uuid, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.begin_chat_thread_setup(uuid, uuid) to service_role;

create or replace function public.finish_chat_thread_setup(
  p_conversation_id uuid,
  p_thread_lease_token uuid,
  p_outcome text,
  p_thread_id text,
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
  if p_conversation_id is null or p_thread_lease_token is null
     or p_outcome not in ('sent', 'uncertain', 'failed')
     or (p_thread_id is not null and p_thread_id !~ '^[0-9]{1,30}$')
     or (p_failure_code is not null and not public.chat_safe_retry_code(p_failure_code)) then
    raise exception 'invalid thread setup completion' using errcode = '22023';
  end if;
  if p_outcome = 'sent' and p_thread_id is null then
    raise exception 'sent thread setup requires an id' using errcode = '22023';
  end if;
  if p_outcome in ('uncertain', 'failed')
     and (p_failure_code is null or p_next_retry_at is null) then
    raise exception 'deferred thread setup requires retry metadata' using errcode = '22023';
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
     or conversation_row.discord_thread_lease_expires_at <= now_at
     or conversation_row.discord_thread_state <> 'claimed' then
    raise exception 'thread setup lease is no longer held' using errcode = 'P0007';
  end if;

  if p_outcome = 'sent' then
    if conversation_row.discord_starter_message_id is null
       or p_thread_id <> conversation_row.discord_starter_message_id then
      raise exception 'thread id must equal the starter message id' using errcode = 'P0005';
    end if;
    if conversation_row.discord_thread_id is not null
       and conversation_row.discord_thread_id <> p_thread_id then
      raise exception 'thread id conflict' using errcode = 'P0005';
    end if;
    update public.chat_conversations
    set discord_thread_id = coalesce(discord_thread_id, p_thread_id),
        discord_thread_state = 'sent',
        discord_thread_attempt_count = 0,
        discord_thread_failure_code = null,
        discord_thread_next_retry_at = null
    where id = conversation_row.id;
  elsif p_outcome = 'uncertain' then
    if p_next_retry_at <= now_at then
      raise exception 'uncertain thread retry time must be in the future' using errcode = '22023';
    end if;
    update public.chat_conversations
    set discord_thread_state = 'uncertain',
        discord_thread_failure_code = p_failure_code,
        discord_thread_next_retry_at = p_next_retry_at
    where id = conversation_row.id;
  else
    if p_next_retry_at <= now_at then
      raise exception 'failed thread retry time must be in the future' using errcode = '22023';
    end if;
    update public.chat_conversations
    set discord_thread_state = 'failed',
        discord_thread_failure_code = p_failure_code,
        discord_thread_next_retry_at = p_next_retry_at
    where id = conversation_row.id;
  end if;

  select * into conversation_row
  from public.chat_conversations
  where id = p_conversation_id;
  return conversation_row;
end;
$$;

revoke all on function public.finish_chat_thread_setup(uuid, uuid, text, text, text, timestamptz)
from public, anon, authenticated, service_role;
grant execute on function public.finish_chat_thread_setup(uuid, uuid, text, text, text, timestamptz)
to service_role;

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
        (c.discord_starter_state = 'uncertain'
         and (c.discord_starter_next_retry_at is null or c.discord_starter_next_retry_at <= n.now_at))
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
    join public.chat_conversations c on c.id = m.conversation_id
    cross join now_value n
    where m.conversation_id = p_conversation_id
      and (c.discord_thread_state not in ('uncertain', 'failed')
           or c.discord_thread_next_retry_at is null
           or c.discord_thread_next_retry_at <= n.now_at)
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
    join public.chat_conversations c on c.id = m.conversation_id
    cross join now_value n
    where m.conversation_id = p_conversation_id
      and (c.discord_thread_state not in ('uncertain', 'failed')
           or c.discord_thread_next_retry_at is null
           or c.discord_thread_next_retry_at <= n.now_at)
      and (
        (p.state = 'uncertain' and p.attempt_count < 20
            and (p.next_retry_at is null or p.next_retry_at <= n.now_at))
        or (p.state = 'claimed' and p.attempt_count < 20 and p.lease_expires_at <= n.now_at)
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

-- Preserve an explicit cooldown when reconciliation itself is rate-limited.
-- The older finish functions accepted p_next_retry_at but unconditionally
-- cleared it for uncertain outcomes, causing every poll to retry immediately.
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
    if p_next_retry_at is not null and p_next_retry_at <= now_at then
      raise exception 'uncertain starter retry time must be in the future' using errcode = '22023';
    end if;
    update public.chat_conversations
    set discord_starter_state = 'uncertain',
        discord_starter_claim_token = null,
        discord_starter_claim_expires_at = null,
        discord_starter_failure_code = coalesce(p_failure_code, 'uncertain'),
        discord_starter_next_retry_at = p_next_retry_at
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
    if p_next_retry_at is not null and p_next_retry_at <= now_at then
      raise exception 'uncertain message retry time must be in the future' using errcode = '22023';
    end if;
    update public.chat_message_parts
    set state = 'uncertain',
        claim_token = null,
        lease_expires_at = null,
        failure_code = coalesce(p_failure_code, 'uncertain'),
        next_retry_at = p_next_retry_at
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
  perform public.refresh_chat_delivery_status(p_conversation_id);
  select * into part_row from public.chat_message_parts where id = p_part_id;
  return part_row;
end;
$$;

revoke all on function public.finish_chat_delivery_part(uuid, uuid, uuid, uuid, text, text, text, timestamptz)
from public, anon, authenticated, service_role;
grant execute on function public.finish_chat_delivery_part(uuid, uuid, uuid, uuid, text, text, text, timestamptz)
to service_role;

-- Keep the global dispatcher subject to the same cap and thread cooldown as a
-- direct conversation retry.  Otherwise an exhausted/429-blocked conversation
-- can still consume the batch and repeatedly wake the bridge.
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
      and exists (
        select 1 from public.chat_messages message_row
        where message_row.conversation_id = c.id
      )
      and (
        (c.discord_starter_state = 'uncertain'
         and (c.discord_starter_next_retry_at is null or c.discord_starter_next_retry_at <= n.now_at))
        or (c.discord_starter_state = 'claimed' and c.discord_starter_claim_expires_at <= n.now_at)
        or c.discord_starter_state = 'pending'
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
    join public.chat_conversations c on c.id = m.conversation_id
    cross join now_value n
    where m.delivery_part_count is null
      and m.delivery_attempts < 20
      and (c.discord_thread_state not in ('uncertain', 'failed')
           or c.discord_thread_next_retry_at is null
           or c.discord_thread_next_retry_at <= n.now_at)
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
    join public.chat_conversations c on c.id = m.conversation_id
    cross join now_value n
    where (c.discord_thread_state not in ('uncertain', 'failed')
           or c.discord_thread_next_retry_at is null
           or c.discord_thread_next_retry_at <= n.now_at)
      and (
        (p.state = 'uncertain' and p.attempt_count < 20
            and (p.next_retry_at is null or p.next_retry_at <= n.now_at))
        or (p.state = 'claimed' and p.attempt_count < 20 and p.lease_expires_at <= n.now_at)
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

revoke all on function public.list_chat_delivery_work_candidates(integer)
from public, anon, authenticated, service_role;
grant execute on function public.list_chat_delivery_work_candidates(integer) to service_role;
