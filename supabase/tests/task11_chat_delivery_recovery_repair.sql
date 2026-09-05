-- Task 4B delivery recovery repairs.
-- Run after 202609050006_chat_delivery_recovery_repair.sql on the disposable
-- Supabase database. Fixtures are transaction-local.
begin;
select plan(13);

select ok(
  has_function_privilege(
    'service_role',
    'public.list_chat_delivery_work_candidates_for_conversation(uuid, integer)',
    'EXECUTE'
  ),
  'service role can invoke the repaired scoped delivery reader'
);

insert into public.chat_conversations (
  id, visitor_token_digest, display_name, email, is_under_13, guardian_attested,
  status, ownership_expires_at, terminal_at, discord_starter_message_id,
  discord_starter_reference, discord_starter_nonce, discord_starter_state,
  discord_thread_id, discord_thread_state, discord_delivery_status,
  created_at, updated_at
) values (
  '75000000-0000-4000-8000-000000000001', repeat('a', 64), 'Capped recovery visitor', '', false, false,
  'open', now() + interval '1 day', null, '950000000000000001',
  'starter-ref-750', 'starter-nonce-750xx', 'sent',
  '950000000000000001', 'sent', 'pending', now() - interval '3 hours', now()
);
insert into public.chat_messages (
  id, conversation_id, sender, body, delivery_status, delivery_part_count,
  created_at, updated_at
) values
  (
    '75000000-0000-4000-8000-000000000101',
    '75000000-0000-4000-8000-000000000001',
    'visitor', 'capped uncertain part', 'pending', 1,
    now() - interval '2 hours', now() - interval '2 hours'
  ),
  (
    '75000000-0000-4000-8000-000000000103',
    '75000000-0000-4000-8000-000000000001',
    'visitor', 'capped expired part', 'pending', 1,
    now() - interval '1 hour', now() - interval '1 hour'
  ),
  (
    '75000000-0000-4000-8000-000000000105',
    '75000000-0000-4000-8000-000000000001',
    'visitor', 'newer eligible part', 'pending', 1,
    now() - interval '1 minute', now() - interval '1 minute'
  ),
  (
    '75000000-0000-4000-8000-000000000107',
    '75000000-0000-4000-8000-000000000001',
    'visitor', 'rate limited uncertain part', 'pending', 1,
    now() - interval '30 minutes', now() - interval '30 minutes'
  );
insert into public.chat_message_parts (
  id, message_id, part_index, part_count, stable_reference, stable_nonce,
  state, claim_token, lease_expires_at, attempt_count, created_at, updated_at
) values
  (
    '75000000-0000-4000-8000-000000000102',
    '75000000-0000-4000-8000-000000000101',
    0, 1, 'part-ref-750-uncertain', 'part-nonce-750-uncertain',
    'uncertain', null, null, 20, now() - interval '2 hours', now() - interval '2 hours'
  ),
  (
    '75000000-0000-4000-8000-000000000104',
    '75000000-0000-4000-8000-000000000103',
    0, 1, 'part-ref-750-claimed', 'part-nonce-750-claimed',
    'claimed', '75000000-0000-4000-8000-000000000114', now() - interval '5 minutes', 20,
    now() - interval '1 hour', now() - interval '1 hour'
  ),
  (
    '75000000-0000-4000-8000-000000000106',
    '75000000-0000-4000-8000-000000000105',
    0, 1, 'part-ref-750-newer', 'part-nonce-750-newer',
    'pending', null, null, 0, now() - interval '1 minute', now() - interval '1 minute'
  ),
  (
    '75000000-0000-4000-8000-000000000108',
    '75000000-0000-4000-8000-000000000107',
    0, 1, 'part-ref-750-cooldown', 'part-nonce-750-cooldown',
    'uncertain', null, null, 1, now() - interval '30 minutes', now() - interval '30 minutes'
  );
update public.chat_message_parts
set next_retry_at = now() + interval '5 minutes'
where id = '75000000-0000-4000-8000-000000000108';

select is(
  (select count(*)::integer
   from public.list_chat_delivery_work_candidates_for_conversation(
     '75000000-0000-4000-8000-000000000001', 50
   )),
  1,
  'capped uncertain and expired claimed parts do not consume the scoped batch'
);
select is(
  (select part_id
   from public.list_chat_delivery_work_candidates_for_conversation(
     '75000000-0000-4000-8000-000000000001', 1
   )),
  '75000000-0000-4000-8000-000000000106'::uuid,
  'the newer eligible part remains first after capped older rows are filtered'
);
select ok(
  not exists (
    select 1
    from public.list_chat_delivery_work_candidates_for_conversation(
      '75000000-0000-4000-8000-000000000001', 50
    )
    where part_id in (
      '75000000-0000-4000-8000-000000000102'::uuid,
      '75000000-0000-4000-8000-000000000104'::uuid
    )
  ),
  'neither capped uncertain nor capped expired claimed work is enumerated'
);
select ok(
  not exists (
    select 1
    from public.list_chat_delivery_work_candidates_for_conversation(
      '75000000-0000-4000-8000-000000000001', 50
    )
    where part_id = '75000000-0000-4000-8000-000000000108'::uuid
  ),
  'a future-due uncertain part is deferred without consuming the scoped batch'
);

insert into public.chat_conversations (
  id, visitor_token_digest, display_name, email, is_under_13, guardian_attested,
  status, ownership_expires_at, terminal_at, discord_starter_message_id,
  discord_starter_reference, discord_starter_nonce, discord_starter_state,
  discord_thread_state, discord_thread_attempt_count, discord_thread_failure_code,
  discord_thread_next_retry_at, discord_delivery_status, created_at, updated_at
) values (
  '75000000-0000-4000-8000-000000000201', repeat('b', 64), 'Thread cooldown visitor', '', false, false,
  'open', now() + interval '1 day', null, '950000000000000201',
  'starter-ref-750-201', 'starter-nonce-750-201x', 'sent',
  'failed', 1, 'discord_429', now() + interval '5 minutes', 'pending', now(), now()
);
insert into public.chat_messages (
  id, conversation_id, sender, body, delivery_status, delivery_part_count, created_at, updated_at
) values (
  '75000000-0000-4000-8000-000000000202',
  '75000000-0000-4000-8000-000000000201',
  'visitor', 'thread cooldown work', 'pending', 1, now(), now()
);
insert into public.chat_message_parts (
  id, message_id, part_index, part_count, stable_reference, stable_nonce,
  state, attempt_count, created_at, updated_at
) values (
  '75000000-0000-4000-8000-000000000203',
  '75000000-0000-4000-8000-000000000202',
  0, 1, 'part-ref-750-cooldown', 'part-nonce-750-cooldown', 'pending', 0, now(), now()
);

select ok(
  not exists (
    select 1
    from public.list_chat_delivery_work_candidates_for_conversation(
      '75000000-0000-4000-8000-000000000201', 50
    )
  ),
  'a durable thread cooldown suppresses scoped work until its due time'
);
select ok(
  has_function_privilege('service_role', 'public.begin_chat_thread_setup(uuid, uuid)', 'EXECUTE'),
  'service role can begin bounded thread setup'
);
select ok(
  has_function_privilege('service_role', 'public.finish_chat_thread_setup(uuid, uuid, text, text, text, timestamptz)', 'EXECUTE'),
  'service role can finish bounded thread setup'
);

insert into public.chat_conversations (
  id, visitor_token_digest, display_name, email, is_under_13, guardian_attested,
  status, ownership_expires_at, terminal_at, discord_starter_message_id,
  discord_starter_reference, discord_starter_nonce, discord_starter_state,
  discord_thread_state, discord_delivery_status, created_at, updated_at
) values (
  '75000000-0000-4000-8000-000000000301', repeat('c', 64), 'Thread setup visitor', '', false, false,
  'open', now() + interval '1 day', null, '950000000000000301',
  'starter-ref-750-301', 'starter-nonce-750-301x', 'sent',
  'pending', 'pending', now(), now()
);
do $$
begin
  perform public.claim_chat_thread_lease(
    '75000000-0000-4000-8000-000000000301',
    '75000000-0000-4000-8000-000000000311',
    60
  );
end;
$$;
select is(
  (select discord_thread_state
   from public.begin_chat_thread_setup(
     '75000000-0000-4000-8000-000000000301',
     '75000000-0000-4000-8000-000000000311'
   )),
  'claimed',
  'thread setup claims a bounded attempt under the conversation lease'
);
select is(
  (select discord_thread_attempt_count
   from public.chat_conversations
   where id = '75000000-0000-4000-8000-000000000301'),
  1,
  'thread setup increments its durable attempt count before network work'
);
select is(
  (select discord_thread_state
   from public.finish_chat_thread_setup(
     '75000000-0000-4000-8000-000000000301',
     '75000000-0000-4000-8000-000000000311',
     'uncertain', null, 'discord_429', now() + interval '5 minutes'
   )),
  'uncertain',
  'thread setup preserves uncertainty while deferring a rate-limited retry'
);
select is(
  (select discord_thread_next_retry_at > now()
   from public.chat_conversations
   where id = '75000000-0000-4000-8000-000000000301'),
  true,
  'thread setup stores the deferred retry timestamp'
);
select throws_ok(
  $$select public.begin_chat_thread_setup(
    '75000000-0000-4000-8000-000000000301',
    '75000000-0000-4000-8000-000000000311'
  )$$,
  'P0007', 'thread setup is waiting for retry',
  'thread setup does not issue another network attempt during cooldown'
);
select * from finish();
rollback;
