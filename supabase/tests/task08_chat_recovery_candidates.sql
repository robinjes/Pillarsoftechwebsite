-- Task 2 recovery enumeration regressions.
-- Run after migration 202609050003_chat_recovery_candidates.sql on the
-- disposable Supabase database.  Fixtures are transaction-local.
begin;
select plan(27);

select ok(
  has_function_privilege('service_role', 'public.list_chat_delivery_work_candidates(integer)', 'EXECUTE'),
  'service role can enumerate delivery recovery work'
);
select ok(
  has_function_privilege('service_role', 'public.list_chat_cleanup_jobs(integer)', 'EXECUTE'),
  'service role can enumerate cleanup recovery work'
);
select ok(
  not has_function_privilege('anon', 'public.list_chat_cleanup_jobs(integer)', 'EXECUTE'),
  'browser roles cannot enumerate cleanup recovery work'
);
select ok(
  not has_table_privilege('service_role', 'public.chat_cleanup_jobs', 'SELECT'),
  'service role does not bypass the cleanup recovery reader'
);

-- A large prefix of empty conversations must not consume the bounded recovery
-- batch.  The message-bearing conversation is deliberately newer.
insert into public.chat_conversations (
  id, visitor_token_digest, display_name, email, is_under_13, guardian_attested,
  status, ownership_expires_at, terminal_at, discord_delivery_status, created_at, updated_at
)
select
  ('72000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
  repeat(md5('empty-starter-' || g::text), 2),
  'Empty starter ' || g::text, '', false, false,
  'open', now() + interval '1 day', null, 'pending',
  now() - interval '2 days' - make_interval(secs => g),
  now() - interval '2 days' - make_interval(secs => g)
from generate_series(1, 100) as series(g);

insert into public.chat_conversations (
  id, visitor_token_digest, display_name, email, is_under_13, guardian_attested,
  status, ownership_expires_at, terminal_at, discord_delivery_status, created_at, updated_at
) values (
  '72000000-0000-4000-8000-000000000101', repeat('a', 64), 'New pending visitor', '', false, false,
  'open', now() + interval '1 day', null, 'pending', now(), now()
);
insert into public.chat_messages (
  id, conversation_id, sender, body, delivery_status, delivery_attempts, created_at, updated_at
) values (
  '72000000-0000-4000-8000-000000000102',
  '72000000-0000-4000-8000-000000000101',
  'visitor', 'new pending message', 'pending', 0, now(), now()
);

do $$
begin
  perform public.claim_chat_thread_lease(
    '72000000-0000-4000-8000-000000000101',
    '72000000-0000-4000-8000-000000000111',
    60
  );
end;
$$;
select throws_ok(
  $$select public.claim_chat_starter_delivery(
    '72000000-0000-4000-8000-000000000101',
    '72000000-0000-4000-8000-000000000111',
    '72000000-0000-4000-8000-000000000112',
    60
  )$$,
  'P0007', 'starter delivery identity is not prepared',
  'starter claim cannot run before deterministic identity preparation'
);

select is(
  (select count(*)
   from public.list_chat_delivery_work_candidates(100)
   where work_kind = 'starter'),
  1::bigint,
  'starter recovery work requires a stored message'
);
select ok(
  exists (
    select 1
    from public.list_chat_delivery_work_candidates(100)
    where message_id = '72000000-0000-4000-8000-000000000102'
      and work_kind = 'message_prepare'
  ),
  'a bounded delivery batch reaches a new message after empty conversations'
);

insert into public.chat_cleanup_jobs (
  id, conversation_id, guild_id, parent_channel_id, state, claim_token,
  lease_expires_at, attempt_count, failure_code, next_retry_at, created_at, updated_at
) values
  (
    '72000000-0000-4000-8000-000000000201',
    '72000000-0000-4000-8000-000000000301',
    '900000000000000001', '910000000000000001', 'pending', null, null, 0, null, null,
    now() - interval '10 minutes', now() - interval '10 minutes'
  ),
  (
    '72000000-0000-4000-8000-000000000202',
    '72000000-0000-4000-8000-000000000302',
    '900000000000000001', '910000000000000001', 'claimed', '72000000-0000-4000-8000-000000000402',
    now() - interval '1 minute', 20, null, null,
    now() - interval '9 minutes', now() - interval '9 minutes'
  ),
  (
    '72000000-0000-4000-8000-000000000203',
    '72000000-0000-4000-8000-000000000303',
    '900000000000000001', '910000000000000001', 'claimed', '72000000-0000-4000-8000-000000000403',
    now() + interval '1 hour', 1, null, null,
    now() - interval '8 minutes', now() - interval '8 minutes'
  ),
  (
    '72000000-0000-4000-8000-000000000204',
    '72000000-0000-4000-8000-000000000304',
    '900000000000000001', '910000000000000001', 'failed', null, null, 1, 'discord_429', now() + interval '1 hour',
    now() - interval '7 minutes', now() - interval '7 minutes'
  ),
  (
    '72000000-0000-4000-8000-000000000205',
    '72000000-0000-4000-8000-000000000305',
    '900000000000000001', '910000000000000001', 'failed', null, null, 20, 'discord_500', now() - interval '1 minute',
    now() - interval '6 minutes', now() - interval '6 minutes'
  ),
  (
    '72000000-0000-4000-8000-000000000206',
    '72000000-0000-4000-8000-000000000306',
    '900000000000000001', '910000000000000001', 'uncertain', null, null, 20, 'timeout', null,
    now() - interval '5 minutes', now() - interval '5 minutes'
  );

select ok(
  exists (
    select 1 from public.list_chat_cleanup_jobs(50)
    where id = '72000000-0000-4000-8000-000000000201'
  ),
  'due pending cleanup is visible'
);
select ok(
  exists (
    select 1 from public.list_chat_cleanup_jobs(50)
    where id = '72000000-0000-4000-8000-000000000202'
  ),
  'expired claimed cleanup is visible for reconciliation'
);
select ok(
  not exists (
    select 1 from public.list_chat_cleanup_jobs(50)
    where id = '72000000-0000-4000-8000-000000000203'
  ),
  'active claimed cleanup is excluded'
);
select ok(
  not exists (
    select 1 from public.list_chat_cleanup_jobs(50)
    where id = '72000000-0000-4000-8000-000000000204'
  ),
  'future failed cleanup is excluded'
);
select ok(
  not exists (
    select 1 from public.list_chat_cleanup_jobs(50)
    where id = '72000000-0000-4000-8000-000000000205'
  ),
  'exhausted failed cleanup is excluded'
);
select ok(
  exists (
    select 1 from public.list_chat_cleanup_jobs(50)
    where id = '72000000-0000-4000-8000-000000000206'
  ),
  'uncertain cleanup remains visible for reconciliation'
);
select is(
  (select id from public.list_chat_cleanup_jobs(1)),
  '72000000-0000-4000-8000-000000000201'::uuid,
  'future and exhausted failures cannot starve a due cleanup batch'
);

insert into public.chat_conversations (
  id, visitor_token_digest, display_name, email, is_under_13, guardian_attested,
  status, ownership_expires_at, terminal_at, discord_starter_reference,
  discord_starter_nonce, discord_starter_state, discord_starter_attempt_count,
  discord_thread_lease_token, discord_thread_lease_expires_at,
  discord_delivery_status, created_at, updated_at
) values
  (
    '72000000-0000-4000-8000-000000000501', repeat('d', 64), 'Uncertain starter retry', '', false, false,
    'open', now() + interval '1 day', null, 'starter-ref-501', 'starter-nonce-501xx', 'uncertain', 19,
    '72000000-0000-4000-8000-000000000511', now() + interval '1 hour',
    'pending', now(), now()
  ),
  (
    '72000000-0000-4000-8000-000000000503', repeat('e', 64), 'Exhausted uncertain starter', '', false, false,
    'open', now() + interval '1 day', null, 'starter-ref-503', 'starter-nonce-503xx', 'uncertain', 20,
    '72000000-0000-4000-8000-000000000513', now() + interval '1 hour',
    'pending', now(), now()
  );
insert into public.chat_messages (
  id, conversation_id, sender, body, delivery_status, delivery_attempts, created_at, updated_at
) values
  ('72000000-0000-4000-8000-000000000502', '72000000-0000-4000-8000-000000000503', 'visitor', 'exhausted starter message', 'pending', 0, now(), now());

select is(
  (select discord_starter_attempt_count from public.claim_uncertain_chat_starter_delivery(
    '72000000-0000-4000-8000-000000000501',
    '72000000-0000-4000-8000-000000000511',
    '72000000-0000-4000-8000-000000000512',
    60
  )),
  20,
  'uncertain starter reconciliation increments its bounded attempt count'
);
select throws_ok(
  $$select public.claim_uncertain_chat_starter_delivery(
    '72000000-0000-4000-8000-000000000503',
    '72000000-0000-4000-8000-000000000513',
    '72000000-0000-4000-8000-000000000514',
    60
  )$$,
  'P0010', 'starter delivery attempts exhausted',
  'an exhausted uncertain starter cannot be reclaimed'
);
select ok(
  not exists (
    select 1 from public.list_chat_delivery_work_candidates(100)
    where conversation_id = '72000000-0000-4000-8000-000000000503'
      and work_kind = 'starter_reconcile'
  ),
  'exhausted uncertain starter is excluded from recovery enumeration'
);

insert into public.chat_conversations (
  id, visitor_token_digest, display_name, email, is_under_13, guardian_attested,
  status, ownership_expires_at, terminal_at, discord_thread_lease_token,
  discord_thread_lease_expires_at, discord_delivery_status, created_at, updated_at
) values (
  '72000000-0000-4000-8000-000000000601', repeat('f', 64), 'Uncertain part retry', '', false, false,
  'open', now() + interval '1 day', null,
  '72000000-0000-4000-8000-000000000611', now() + interval '1 hour',
  'pending', now(), now()
);
insert into public.chat_messages (
  id, conversation_id, sender, body, delivery_status, delivery_attempts, delivery_part_count, created_at, updated_at
) values (
  '72000000-0000-4000-8000-000000000602', '72000000-0000-4000-8000-000000000601',
  'visitor', 'exhausted uncertain part message', 'pending', 0, 1, now(), now()
);
insert into public.chat_message_parts (
  id, message_id, part_index, part_count, stable_reference, stable_nonce,
  state, attempt_count, created_at, updated_at
) values (
  '72000000-0000-4000-8000-000000000603', '72000000-0000-4000-8000-000000000602',
  0, 1, 'part-ref-603', 'part-nonce-603xx', 'uncertain', 19, now(), now()
);

select is(
  (select attempt_count from public.claim_uncertain_chat_delivery_part(
    '72000000-0000-4000-8000-000000000601',
    '72000000-0000-4000-8000-000000000611',
    '72000000-0000-4000-8000-000000000603',
    '72000000-0000-4000-8000-000000000612',
    60
  )),
  20,
  'uncertain part reconciliation increments its bounded attempt count'
);
update public.chat_message_parts
set state = 'uncertain', claim_token = null, lease_expires_at = null
where id = '72000000-0000-4000-8000-000000000603';
select throws_ok(
  $$select public.claim_uncertain_chat_delivery_part(
    '72000000-0000-4000-8000-000000000601',
    '72000000-0000-4000-8000-000000000611',
    '72000000-0000-4000-8000-000000000603',
    '72000000-0000-4000-8000-000000000613',
    60
  )$$,
  'P0010', 'message delivery attempts exhausted',
  'an exhausted uncertain part cannot be reclaimed'
);
select ok(
  not exists (
    select 1 from public.list_chat_delivery_work_candidates(100)
    where part_id = '72000000-0000-4000-8000-000000000603'
  ),
  'exhausted uncertain part is excluded from recovery enumeration'
);

-- Thread and starter creation have independent leases.  An expired thread
-- lease must not allow retention to delete a terminal conversation while the
-- starter claim is still active; after that claim expires, cleanup is safe.
insert into public.chat_conversations (
  id, visitor_token_digest, display_name, email, is_under_13, guardian_attested,
  status, ownership_expires_at, terminal_at, discord_starter_state,
  discord_starter_claim_token, discord_starter_claim_expires_at,
  discord_thread_lease_token, discord_thread_lease_expires_at,
  discord_delivery_status, created_at, updated_at
) values
  (
    '72000000-0000-4000-8000-000000000401', repeat('b', 64), 'Active starter claim', '', false, false,
    'closed', now() + interval '1 day', now() - interval '40 days', 'claimed',
    '72000000-0000-4000-8000-000000000411', now() + interval '1 hour',
    '72000000-0000-4000-8000-000000000421', now() - interval '1 minute',
    'pending', now() - interval '45 days', now() - interval '40 days'
  ),
  (
    '72000000-0000-4000-8000-000000000402', repeat('c', 64), 'Expired starter claim', '', false, false,
    'closed', now() + interval '1 day', now() - interval '40 days', 'claimed',
    '72000000-0000-4000-8000-000000000412', now() - interval '1 minute',
    '72000000-0000-4000-8000-000000000422', now() - interval '1 minute',
    'pending', now() - interval '45 days', now() - interval '40 days'
  );

select is(
  (select count(*) from public.prepare_chat_retention_cleanup(
    '900000000000000001', '910000000000000001', now() - interval '30 days', 10
  )),
  1::bigint,
  'retention skips an active starter claim even after the thread lease expires'
);
select is(
  (select count(*) from public.chat_conversations where id = '72000000-0000-4000-8000-000000000401'),
  1::bigint,
  'active starter claim preserves the terminal conversation'
);
select is(
  (select count(*) from public.chat_conversations where id = '72000000-0000-4000-8000-000000000402'),
  0::bigint,
  'expired starter claim permits terminal conversation cleanup'
);
select is(
  (select count(*) from public.chat_cleanup_jobs where conversation_id = '72000000-0000-4000-8000-000000000402'),
  1::bigint,
  'expired starter cleanup retains a body-free reconciliation job'
);

-- Terminal conversations retain their delivery lease path for already-stored
-- messages.  Closing the website conversation must not strand an earlier
-- message or rewrite its terminal timestamp.
insert into public.chat_conversations (
  id, visitor_token_digest, display_name, email, is_under_13, guardian_attested,
  status, ownership_expires_at, terminal_at, discord_starter_message_id,
  discord_starter_reference, discord_starter_nonce, discord_starter_state,
  discord_delivery_status, created_at, updated_at
) values (
  '72000000-0000-0000-0000-000000000701', repeat('1', 64), 'Closed delivery visitor', '', false, false,
  'closed', now() + interval '1 day', now() - interval '1 day', '970000000000000701',
  'starter-ref-701', 'starter-nonce-701xx', 'sent', 'sent',
  now() - interval '3 days', now() - interval '1 day'
);
insert into public.chat_messages (
  id, conversation_id, sender, body, delivery_status, delivery_part_count, created_at, updated_at
) values (
  '72000000-0000-0000-0000-000000000702',
  '72000000-0000-0000-0000-000000000701',
  'visitor', 'stored before terminal close', 'pending', 1,
  now() - interval '2 days', now() - interval '2 days'
);
insert into public.chat_message_parts (
  id, message_id, part_index, part_count, stable_reference, stable_nonce,
  state, attempt_count, created_at, updated_at
) values (
  '72000000-0000-0000-0000-000000000703',
  '72000000-0000-0000-0000-000000000702',
  0, 1, 'part-ref-703', 'part-nonce-703xx', 'pending', 0,
  now() - interval '2 days', now() - interval '2 days'
);
select is(
  (select discord_thread_lease_token from public.claim_chat_thread_lease(
    '72000000-0000-0000-0000-000000000701',
    '72000000-0000-0000-0000-000000000711',
    60
  )),
  '72000000-0000-0000-0000-000000000711'::uuid,
  'terminal conversation can acquire a delivery lease for stored work'
);
select is(
  (select state from public.claim_next_chat_delivery_part(
    '72000000-0000-0000-0000-000000000701',
    '72000000-0000-0000-0000-000000000711',
    '72000000-0000-0000-0000-000000000712',
    60
  )),
  'claimed',
  'terminal conversation can deliver an earlier stored message'
);
select ok(
  (select terminal_at < now() - interval '23 hours'
   from public.chat_conversations
   where id = '72000000-0000-0000-0000-000000000701'),
  'terminal delivery does not rewrite the terminal timestamp'
);

select * from finish();
rollback;
