-- Task 2 recovery enumeration repairs.
--
-- Keep the durable recovery readers body-free and service-only.  Starter work
-- is only real work when the conversation has at least one stored message;
-- cleanup work is limited to due retryable rows plus rows that need explicit
-- lease/uncertainty reconciliation.

alter table public.chat_conversations
  drop constraint if exists chat_conversations_starter_identity_pair;
alter table public.chat_conversations
  add constraint chat_conversations_starter_identity_pair
  check ((discord_starter_reference is null and discord_starter_nonce is null)
      or (discord_starter_reference is not null and discord_starter_nonce is not null));

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
        select 1
        from public.chat_messages message_row
        where message_row.conversation_id = c.id
      )
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
      (p.state = 'uncertain' and p.attempt_count < 20)
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

revoke all on function public.list_chat_delivery_work_candidates(integer) from public, anon, authenticated, service_role;
grant execute on function public.list_chat_delivery_work_candidates(integer) to service_role;

create or replace function public.list_chat_cleanup_jobs(
  p_limit integer
)
returns setof public.chat_cleanup_jobs
language sql
security definer
set search_path = ''
as $$
  with now_value as (select clock_timestamp() as now_at)
  select job.*
  from public.chat_cleanup_jobs job
  cross join now_value n
  where (
    job.state in ('pending', 'failed')
    and job.attempt_count < 20
    and (job.next_retry_at is null or job.next_retry_at <= n.now_at)
  )
  or job.state = 'uncertain'
  or (job.state = 'claimed' and job.lease_expires_at <= n.now_at)
  order by job.created_at asc, job.id asc
  limit least(greatest(coalesce(p_limit, 1), 1), 50);
$$;

revoke all on function public.list_chat_cleanup_jobs(integer) from public, anon, authenticated, service_role;
grant execute on function public.list_chat_cleanup_jobs(integer) to service_role;
revoke select on table public.chat_cleanup_jobs from service_role;

-- An expired thread lease does not prove that an in-flight starter create has
-- finished.  Keep a terminal conversation until its independent starter
-- claim has also expired, otherwise retention can delete the conversation and
-- lose the body-free coordinates needed to reconcile the Discord message.
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
    -- touching thread, starter, or part leases, so these checks remain atomic
    -- with deletion.
    if conversation_row.discord_thread_lease_token is not null
       and conversation_row.discord_thread_lease_expires_at > now_at then
      continue;
    end if;
    if conversation_row.discord_starter_state = 'claimed'
       and conversation_row.discord_starter_claim_expires_at > now_at then
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

revoke all on function public.prepare_chat_retention_cleanup(text, text, timestamptz, integer)
from public, anon, authenticated, service_role;
grant execute on function public.prepare_chat_retention_cleanup(text, text, timestamptz, integer)
to service_role;

-- A starter claim is only meaningful after its deterministic identity has been
-- persisted.  Without this guard an uncertain send would have no stable
-- reference/nonce with which to reconcile the external message.
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
  if conversation_row.discord_starter_reference is null
     or conversation_row.discord_starter_nonce is null then
    raise exception 'starter delivery identity is not prepared' using errcode = 'P0007';
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

revoke all on function public.claim_chat_starter_delivery(uuid, uuid, uuid, integer)
from public, anon, authenticated, service_role;
grant execute on function public.claim_chat_starter_delivery(uuid, uuid, uuid, integer)
to service_role;

-- Reconciliation is another external attempt.  Count it against the same
-- bounded budget and refuse an already exhausted uncertain record.
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
  if conversation_row.discord_starter_reference is null
     or conversation_row.discord_starter_nonce is null then
    raise exception 'starter delivery identity is not prepared' using errcode = 'P0007';
  end if;
  if conversation_row.discord_starter_attempt_count >= 20 then
    raise exception 'starter delivery attempts exhausted' using errcode = 'P0010';
  end if;
  update public.chat_conversations
  set discord_starter_state = 'claimed',
      discord_starter_claim_token = p_claim_token,
      discord_starter_claim_expires_at = now_at + pg_catalog.make_interval(secs => p_lease_seconds),
      discord_starter_attempt_count = discord_starter_attempt_count + 1
  where id = conversation_row.id
  returning * into conversation_row;
  return conversation_row;
end;
$$;

revoke all on function public.claim_uncertain_chat_starter_delivery(uuid, uuid, uuid, integer)
from public, anon, authenticated, service_role;
grant execute on function public.claim_uncertain_chat_starter_delivery(uuid, uuid, uuid, integer)
to service_role;

-- Refresh the wall clock after the conversation lock.  A waiter must not pass
-- an already-expired lease using a timestamp sampled before the lock wait.
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
  now_at timestamptz;
begin
  if p_conversation_id is null or p_conversation_lease_token is null or p_claim_token is null
     or p_lease_seconds not between 1 and 300 then
    raise exception 'invalid message delivery claim' using errcode = '22023';
  end if;
  select * into conversation_row from public.chat_conversations where id = p_conversation_id for update;
  if not found then raise exception 'chat conversation was not found' using errcode = 'P0002'; end if;
  now_at := coalesce(p_now, clock_timestamp());
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

revoke all on function public.chat_claim_part_at(uuid, uuid, uuid, integer, timestamptz, boolean)
from public, anon, authenticated, service_role;

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
  if part_row.attempt_count >= 20 then
    raise exception 'message delivery attempts exhausted' using errcode = 'P0010';
  end if;
  update public.chat_message_parts
  set state = 'claimed',
      claim_token = p_claim_token,
      lease_expires_at = now_at + pg_catalog.make_interval(secs => p_lease_seconds),
      attempt_count = attempt_count + 1
  where id = part_row.id
  returning * into part_row;
  return part_row;
end;
$$;

revoke all on function public.claim_uncertain_chat_delivery_part(uuid, uuid, uuid, uuid, integer)
from public, anon, authenticated, service_role;
grant execute on function public.claim_uncertain_chat_delivery_part(uuid, uuid, uuid, uuid, integer)
to service_role;
