-- Task 4B queue-cap repair.
-- Migration 006 correctly caps thread setup attempts, but its candidate
-- readers still returned message/part work for an exhausted thread row.  A
-- dispatcher would claim the conversation, fail at P0010, and spend every
-- bounded batch slot on the same stored row.  Keep those rows durable for
-- manual reporting while excluding their dependent work from both readers.

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
      and c.discord_thread_attempt_count < 20
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
      and c.discord_thread_attempt_count < 20
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
      and c.discord_thread_attempt_count < 20
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
    where c.discord_thread_attempt_count < 20
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

revoke all on function public.list_chat_delivery_work_candidates(integer)
from public, anon, authenticated, service_role;
grant execute on function public.list_chat_delivery_work_candidates(integer) to service_role;
