-- Task 2 staff operations, durable delivery, and retention behavior.
-- Run only against the disposable Supabase database after migration
-- 202609050002_chat_staff_delivery.sql.  Fixtures are transaction-local.
begin;
select plan(65);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('71000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chat-staff@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('71000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chat-nonstaff@test.invalid', '', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;
insert into public.staff_members(user_id)
values ('71000000-0000-4000-8000-000000000001')
on conflict (user_id) do nothing;
insert into public.staff_discord_identities(user_id, discord_user_id)
values ('71000000-0000-4000-8000-000000000001', '900000000000000001')
on conflict (discord_user_id) do nothing;

select has_table('public', 'chat_action_receipts', 'durable action receipts exist');
select has_table('public', 'chat_message_parts', 'durable message parts exist');
select has_table('public', 'chat_cleanup_jobs', 'body-free cleanup jobs exist');
select has_column('public', 'chat_conversations', 'discord_starter_message_id', 'starter message id is stored');
select has_column('public', 'chat_conversations', 'discord_thread_lease_token', 'thread lease token is stored');
select has_column('public', 'chat_messages', 'author_user_id', 'staff author is stored privately');
select has_column('public', 'chat_messages', 'staff_message_id', 'staff idempotency key is separate');
select has_column('public', 'chat_messages', 'delivery_part_count', 'message part count is stored');
select ok(not has_table_privilege('anon', 'public.chat_message_parts', 'SELECT'), 'anon cannot read message parts');
select ok(not has_table_privilege('authenticated', 'public.chat_message_parts', 'SELECT'), 'authenticated cannot read message parts');
select ok(not has_table_privilege('service_role', 'public.chat_message_parts', 'INSERT'), 'service role cannot bypass part RPC inserts');
select ok(not has_table_privilege('service_role', 'public.chat_cleanup_jobs', 'DELETE'), 'service role cannot directly delete cleanup jobs');
select ok(not has_function_privilege('anon', 'public.insert_chat_staff_message(uuid,uuid,uuid,text,text,text)', 'EXECUTE'), 'anon cannot call staff reply RPC');
select ok(not has_function_privilege('authenticated', 'public.set_chat_queue_state(uuid,boolean,text,text)', 'EXECUTE'), 'authenticated cannot call queue RPC');
select ok(has_function_privilege('service_role', 'public.insert_chat_staff_message(uuid,uuid,uuid,text,text,text)', 'EXECUTE'), 'service role can call staff reply RPC');
select ok(has_function_privilege('service_role', 'public.prepare_chat_retention_cleanup(text,text,timestamptz,integer)', 'EXECUTE'), 'service role can call retention preparation RPC');

select throws_ok(
  $$select public.chat_test_set_queue_state('71000000-0000-4000-8000-000000000002', true, '2026-09-11T23:00:00Z'::timestamptz, 'nonstaff-open', null)$$,
  'P0006', 'staff authorization is unavailable', 'non-staff cannot open the queue'
);
select throws_ok(
  $$select public.chat_test_set_queue_state('71000000-0000-4000-8000-000000000001', true, '2026-09-12T23:00:00Z'::timestamptz, 'weekend-open', null)$$,
  'P0009', 'queue may only open during staffed hours', 'queue cannot open on a weekend'
);
select is(
  (public.chat_test_set_queue_state('71000000-0000-4000-8000-000000000001', true, '2026-09-11T23:00:00Z'::timestamptz, 'open-action-1', '900000000000000001')).queue_open,
  true, 'queue opens in the staffed Pacific window'
);
select is(
  (public.chat_test_set_queue_state('71000000-0000-4000-8000-000000000001', true, '2026-09-11T23:01:00Z'::timestamptz, 'open-action-1', '900000000000000001')).queue_expires_at,
  '2026-09-12T05:00:00+00'::timestamptz, 'queue expiry is the same Pacific day at 22:00'
);
select is(
  (public.chat_test_set_queue_state('71000000-0000-4000-8000-000000000001', false, '2026-09-11T23:02:00Z'::timestamptz, 'close-action-1', '900000000000000001')).queue_open,
  false, 'queue close clears the open flag'
);
select is(
  (select queue_expires_at from public.chat_queue_state where singleton_key = 'default'),
  null::timestamptz, 'queue close clears expiry'
);
select is(
  (public.chat_test_set_queue_state('71000000-0000-4000-8000-000000000001', true, '2026-09-11T23:03:00Z'::timestamptz, 'open-action-1', '900000000000000001')).queue_open,
  false, 'replaying an old queue-open action cannot reopen after close'
);
select throws_ok(
  $$select public.chat_test_set_queue_state('71000000-0000-4000-8000-000000000001', false, '2026-09-11T23:04:00Z'::timestamptz, 'open-action-1', '900000000000000001')$$,
  'P0005', 'action interaction id conflict', 'an interaction id cannot change queue action'
);
select throws_ok(
  $$select public.chat_test_set_queue_state('71000000-0000-4000-8000-000000000001', true, '2026-09-11T23:04:00Z'::timestamptz, 'mapping-bad', '900000000000000002')$$,
  'P0008', 'staff Discord mapping is unavailable', 'queue mutation requires the active Discord mapping when supplied'
);

insert into public.chat_conversations (
  id, visitor_token_digest, display_name, email, is_under_13, guardian_attested,
  status, ownership_expires_at, terminal_at, discord_delivery_status, created_at, updated_at
) values (
  '71000000-0000-4000-8000-000000000101', repeat('a', 64), 'Staff test visitor', 'visitor@example.test', false, false,
  'open', '2099-12-31T00:00:00Z', null, 'pending', now(), now()
);
select is(
  (select sender from public.insert_chat_staff_message(
    '71000000-0000-4000-8000-000000000101', '71000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000201', 'After-hours staff reply', null, null
  )),
  'staff', 'staff may reply to an unexpired conversation after queue close'
);
select is(
  (select author_user_id from public.chat_messages where staff_message_id = '71000000-0000-4000-8000-000000000201'),
  '71000000-0000-4000-8000-000000000001'::uuid, 'staff author id is private on the message row'
);
select is(
  (select count(*) from public.insert_chat_staff_message(
    '71000000-0000-4000-8000-000000000101', '71000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000201', 'After-hours staff reply', null, null
  )),
  1::bigint, 'same staff UUID retry returns exactly one original row'
);
select throws_ok(
  $$select public.insert_chat_staff_message(
    '71000000-0000-4000-8000-000000000101', '71000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000201', 'Changed body', null, null
  )$$,
  'P0005', 'staff message id conflict', 'reused staff UUID with a different body conflicts'
);
select is(
  (select count(*) from public.insert_chat_staff_message(
    '71000000-0000-4000-8000-000000000101', '71000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000202', 'Discord-bound reply', '910000000000000001', '900000000000000001'
  )),
  1::bigint, 'Discord reply stores one source interaction'
);
select is(
  (select count(*) from public.insert_chat_staff_message(
    '71000000-0000-4000-8000-000000000101', '71000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000202', 'Discord-bound reply', '910000000000000001', '900000000000000001'
  )),
  1::bigint, 'Discord source interaction retry does not duplicate website text'
);
select throws_ok(
  $$select public.insert_chat_staff_message(
    '71000000-0000-4000-8000-000000000101', '71000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000203', 'Different source body', '910000000000000001', '900000000000000001'
  )$$,
  'P0005', 'action interaction id conflict', 'reused source interaction with another body conflicts'
);
select is(
  (public.set_chat_conversation_terminal('71000000-0000-4000-8000-000000000101', '71000000-0000-4000-8000-000000000001', 'closed', null, 'close-action-101')).status,
  'closed', 'staff can terminal-close a conversation'
);
select is(
  (select terminal_at from public.chat_conversations where id = '71000000-0000-4000-8000-000000000101'),
  (select terminal_at from public.set_chat_conversation_terminal('71000000-0000-4000-8000-000000000101', '71000000-0000-4000-8000-000000000001', 'closed', null, 'close-action-101')),
  'duplicate close keeps terminal timestamp unchanged'
);
select throws_ok(
  $$select public.set_chat_conversation_terminal('71000000-0000-4000-8000-000000000101', '71000000-0000-4000-8000-000000000001', 'spam', null, 'spam-action-101')$$,
  'P0005', 'conversation already has another terminal state', 'a different terminal state cannot overwrite close'
);
select throws_ok(
  $$select public.insert_chat_staff_message(
    '71000000-0000-4000-8000-000000000101', '71000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000204', 'No new terminal reply', null, null
  )$$,
  'P0003', 'chat conversation is closed', 'new staff reply cannot target a terminal conversation'
);

-- Starter lease and delivery: all calls are short database transactions; the
-- hypothetical Discord network operation sits between claim and finish.
insert into public.chat_conversations (
  id, visitor_token_digest, display_name, email, is_under_13, guardian_attested,
  status, ownership_expires_at, terminal_at, discord_delivery_status, created_at, updated_at
) values (
  '71000000-0000-4000-8000-000000000106', repeat('f', 64), 'Delivery visitor', '', false, false,
  'open', '2099-12-31T00:00:00Z', null, 'pending', now(), now()
);
select is(
  (public.claim_chat_thread_lease('71000000-0000-4000-8000-000000000106', '71000000-0000-4000-8000-000000000301', 60)).discord_thread_lease_token,
  '71000000-0000-4000-8000-000000000301'::uuid, 'terminal conversation may finish earlier delivery under a lease'
);
select is(
  (select discord_starter_reference from public.prepare_chat_starter_delivery(
    '71000000-0000-4000-8000-000000000106', '71000000-0000-4000-8000-000000000301', 'chat-7100000000000106', 'nonce-7100000000000106'
  )),
  'chat-7100000000000106', 'starter reference is persisted before network delivery'
);
select is(
  (select discord_starter_state from public.claim_chat_starter_delivery(
    '71000000-0000-4000-8000-000000000106', '71000000-0000-4000-8000-000000000301', '71000000-0000-4000-8000-000000000302', 60
  )),
  'claimed', 'starter attempt is claimed before network delivery'
);
select is(
  (select discord_starter_state from public.finish_chat_starter_delivery(
    '71000000-0000-4000-8000-000000000106', '71000000-0000-4000-8000-000000000301', '71000000-0000-4000-8000-000000000302', 'uncertain', null, 'timeout', null
  )),
  'uncertain', 'possibly delivered starter is recorded uncertain'
);
select throws_ok(
  $$select public.claim_chat_starter_delivery(
    '71000000-0000-4000-8000-000000000106', '71000000-0000-4000-8000-000000000301', '71000000-0000-4000-8000-000000000303', 60
  )$$,
  'P0007', 'uncertain starter delivery requires reconciliation', 'uncertain starter is never resent by the fresh pending claim path'
);
select is(
  (select discord_starter_state from public.claim_uncertain_chat_starter_delivery(
    '71000000-0000-4000-8000-000000000106', '71000000-0000-4000-8000-000000000301', '71000000-0000-4000-8000-000000000304', 60
  )),
  'claimed', 'uncertain starter has a separate reconciliation claim'
);
select is(
  (select discord_starter_message_id from public.finish_chat_starter_delivery(
    '71000000-0000-4000-8000-000000000106', '71000000-0000-4000-8000-000000000301', '71000000-0000-4000-8000-000000000304', 'sent', '920000000000000001', null, null
  )),
  '920000000000000001', 'successful starter stores the bot message id'
);
select is(
  (select discord_thread_id from public.save_chat_thread_id('71000000-0000-4000-8000-000000000106', '71000000-0000-4000-8000-000000000301', '920000000000000001')),
  '920000000000000001', 'Start Thread from Message stores a thread id equal to starter id'
);
select throws_ok(
  $$select public.save_chat_thread_id('71000000-0000-4000-8000-000000000106', '71000000-0000-4000-8000-000000000301', '920000000000000002')$$,
  'P0005', 'thread id must equal the starter message id', 'a different thread id cannot be persisted'
);

insert into public.chat_messages (id, conversation_id, sender, body, delivery_status, delivery_attempts, created_at, updated_at)
values ('71000000-0000-4000-8000-000000000401', '71000000-0000-4000-8000-000000000106', 'visitor', 'Part one body', 'pending', 0, now() + interval '1 second', now() + interval '1 second');
select is(
  (select count(*) from public.prepare_chat_message_parts('71000000-0000-4000-8000-000000000401', '[{"part_index":0,"stable_reference":"msg-401-0","stable_nonce":"nonce-7100000000000401"},{"part_index":1,"stable_reference":"msg-401-1","stable_nonce":"nonce-7100000000000402"}]'::jsonb)),
  2::bigint, 'message part preparation records both deterministic parts'
);
select is(
  (select delivery_part_count from public.chat_messages where id = '71000000-0000-4000-8000-000000000401'),
  2, 'message part count is recorded on the original message'
);
select throws_ok(
  $$select * from public.prepare_chat_message_parts('71000000-0000-4000-8000-000000000401', '[{"part_index":0,"stable_reference":"changed-ref","stable_nonce":"nonce-7100000000000401"},{"part_index":1,"stable_reference":"msg-401-1","stable_nonce":"nonce-7100000000000402"}]'::jsonb)$$,
  'P0005', 'message part metadata is immutable', 'part reference cannot change on retry'
);
select is(
  (select state from public.claim_next_chat_delivery_part('71000000-0000-4000-8000-000000000106', '71000000-0000-4000-8000-000000000301', '71000000-0000-4000-8000-000000000402', 60)),
  'claimed', 'first message part claims in conversation order'
);
select throws_ok(
  $$select public.finish_chat_delivery_part('71000000-0000-4000-8000-000000000106', '71000000-0000-4000-8000-000000000301', (select id from public.chat_message_parts where message_id='71000000-0000-4000-8000-000000000401' and part_index=0), '71000000-0000-4000-8000-000000000499', 'sent', '930000000000000001', null, null)$$,
  'P0007', 'message delivery lease is no longer held', 'stale part completion cannot overwrite a newer claim'
);
select is(
  (select state from public.finish_chat_delivery_part('71000000-0000-4000-8000-000000000106', '71000000-0000-4000-8000-000000000301', (select id from public.chat_message_parts where message_id='71000000-0000-4000-8000-000000000401' and part_index=0), '71000000-0000-4000-8000-000000000402', 'uncertain', null, 'timeout', null)),
  'uncertain', 'uncertain part completion is durable'
);
select is(
  (select count(*) from public.list_chat_delivery_work_candidates(50) where work_kind = 'part_reconcile'),
  1::bigint, 'recovery enumeration exposes uncertain parts without bodies'
);
select is(
  (select state from public.claim_uncertain_chat_delivery_part('71000000-0000-4000-8000-000000000106', '71000000-0000-4000-8000-000000000301', (select id from public.chat_message_parts where message_id='71000000-0000-4000-8000-000000000401' and part_index=0), '71000000-0000-4000-8000-000000000403', 60)),
  'claimed', 'uncertain part requires a reconciliation claim'
);
select is(
  (select state from public.finish_chat_delivery_part('71000000-0000-4000-8000-000000000106', '71000000-0000-4000-8000-000000000301', (select id from public.chat_message_parts where message_id='71000000-0000-4000-8000-000000000401' and part_index=0), '71000000-0000-4000-8000-000000000403', 'sent', '930000000000000001', null, null)),
  'sent', 'reconciled part stores the Discord message id'
);
select is(
  (select state from public.claim_next_chat_delivery_part('71000000-0000-4000-8000-000000000106', '71000000-0000-4000-8000-000000000301', '71000000-0000-4000-8000-000000000404', 60)),
  'claimed', 'second part becomes eligible only after first is sent'
);

insert into public.chat_conversations (
  id, visitor_token_digest, display_name, email, is_under_13, guardian_attested,
  status, ownership_expires_at, terminal_at, discord_starter_message_id, discord_thread_id,
  discord_delivery_status, created_at, updated_at
) values
  ('71000000-0000-4000-8000-000000000501', repeat('b', 64), 'Old visitor', 'old@example.test', false, false, 'closed', '2099-12-31T00:00:00Z', now() - interval '40 days', '940000000000000001', '940000000000000001', 'sent', now() - interval '45 days', now() - interval '40 days'),
  ('71000000-0000-4000-8000-000000000502', repeat('c', 64), 'New visitor', 'new@example.test', false, false, 'closed', '2099-12-31T00:00:00Z', now() - interval '5 days', null, null, 'pending', now() - interval '6 days', now() - interval '5 days'),
  ('71000000-0000-4000-8000-000000000503', repeat('d', 64), 'Open visitor', 'open@example.test', false, false, 'open', '2099-12-31T00:00:00Z', null, null, null, 'pending', now() - interval '45 days', now() - interval '45 days'),
  ('71000000-0000-4000-8000-000000000504', repeat('e', 64), 'Leased old visitor', 'leased@example.test', false, false, 'closed', '2099-12-31T00:00:00Z', now() - interval '40 days', '940000000000000004', '940000000000000004', 'sent', now() - interval '45 days', now() - interval '40 days');
update public.chat_conversations
set discord_thread_lease_token = '71000000-0000-4000-8000-000000000504',
    discord_thread_lease_expires_at = now() + interval '1 hour'
where id = '71000000-0000-4000-8000-000000000504';
insert into public.chat_messages (id, conversation_id, sender, body, delivery_status, created_at, updated_at)
values ('71000000-0000-4000-8000-000000000505', '71000000-0000-4000-8000-000000000501', 'visitor', 'private old body', 'sent', now() - interval '40 days', now() - interval '40 days');
select throws_ok(
  $$select * from public.prepare_chat_retention_cleanup('900000000000000001','910000000000000001', now() - interval '1 day', 10)$$,
  '22023', 'retention cutoff is not old enough', 'retention RPC rejects a too-new cutoff'
);
select is(
  (select count(*) from public.prepare_chat_retention_cleanup('900000000000000001','910000000000000001', now() - interval '30 days', 10)),
  1::bigint, 'retention prepares only an eligible old terminal conversation'
);
select is((select count(*) from public.chat_conversations where id='71000000-0000-4000-8000-000000000501'), 0::bigint, 'eligible old conversation is deleted after cleanup preparation');
select is((select count(*) from public.chat_messages where conversation_id='71000000-0000-4000-8000-000000000501'), 0::bigint, 'transcript cascades only after body-free cleanup row is inserted');
select is((select count(*) from public.chat_conversations where id='71000000-0000-4000-8000-000000000502'), 1::bigint, 'newer terminal conversation is preserved');
select is((select count(*) from public.chat_conversations where id='71000000-0000-4000-8000-000000000503'), 1::bigint, 'open conversation is preserved');
select is((select count(*) from public.chat_conversations where id='71000000-0000-4000-8000-000000000504'), 1::bigint, 'active delivery lease blocks retention');
select ok(
  (select (to_jsonb(job)::text not like '%Old visitor%' and to_jsonb(job)::text not like '%old@example.test%' and to_jsonb(job)::text not like '%private old body%') from public.chat_cleanup_jobs job where conversation_id='71000000-0000-4000-8000-000000000501'),
  'cleanup record contains no name email or transcript body'
);
select is(
  (select state from public.claim_chat_cleanup_job((select id from public.chat_cleanup_jobs where conversation_id='71000000-0000-4000-8000-000000000501'), '71000000-0000-4000-8000-000000000601', 60)),
  'claimed', 'cleanup job has an atomic claim'
);
select is(
  (select state from public.finish_chat_cleanup_job((select id from public.chat_cleanup_jobs where conversation_id='71000000-0000-4000-8000-000000000501'), '71000000-0000-4000-8000-000000000601', 'failed', 'discord_429', now() + interval '1 hour')),
  'failed', 'cleanup failure stores only a safe retry code and time'
);

select * from finish();
rollback;
