-- Task 4B aggregate delivery-status regressions.
-- Run after 202609050005_chat_delivery_aggregate_status.sql on the disposable
-- Supabase database. Fixtures are transaction-local.
begin;
select plan(12);

select ok(
  has_function_privilege('service_role', 'public.refresh_chat_delivery_status(uuid)', 'EXECUTE'),
  'service role can invoke the aggregate status helper'
);
select ok(
  has_function_privilege('service_role', 'public.list_chat_delivery_work_candidates_for_conversation(uuid, integer)', 'EXECUTE'),
  'service role can invoke the conversation-scoped work query'
);

insert into public.chat_conversations (
  id, visitor_token_digest, display_name, email, is_under_13, guardian_attested,
  status, ownership_expires_at, terminal_at, discord_starter_message_id,
  discord_starter_reference, discord_starter_nonce, discord_starter_state,
  discord_thread_id, discord_delivery_status, created_at, updated_at
) values (
  '74000000-0000-4000-8000-000000000001', repeat('a', 64), 'Aggregate visitor', '', false, false,
  'open', '2099-12-31T00:00:00Z', null, '940000000000000001',
  'chat-aggregate-starter', 'nonce-aggregate-starter', 'sent',
  '940000000000000001', 'pending', now(), now()
);
insert into public.chat_messages (
  id, conversation_id, sender, body, delivery_status, delivery_part_count, created_at, updated_at
) values (
  '74000000-0000-4000-8000-000000000002',
  '74000000-0000-4000-8000-000000000001',
  'visitor', 'aggregate body is retained', 'pending', 2, now(), now()
);
insert into public.chat_message_parts (
  id, message_id, part_index, part_count, stable_reference, stable_nonce,
  state, attempt_count, created_at, updated_at
) values
  ('74000000-0000-4000-8000-000000000003', '74000000-0000-4000-8000-000000000002', 0, 2, 'aggregate-part-0', 'nonce-aggregate-part-0', 'pending', 0, now(), now()),
  ('74000000-0000-4000-8000-000000000004', '74000000-0000-4000-8000-000000000002', 1, 2, 'aggregate-part-1', 'nonce-aggregate-part-1', 'pending', 0, now(), now());

select is(
  (select count(*)::integer from public.list_chat_delivery_work_candidates_for_conversation(
    '74000000-0000-4000-8000-000000000001', 12
  )),
  2,
  'conversation-scoped work query returns both target parts'
);

select is(
  (public.claim_chat_thread_lease(
    '74000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000010', 60
  )).discord_thread_lease_token,
  '74000000-0000-4000-8000-000000000010'::uuid,
  'aggregate fixture obtains a conversation lease'
);
select is(
  (select state from public.claim_next_chat_delivery_part(
    '74000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000010',
    '74000000-0000-4000-8000-000000000011', 60
  )),
  'claimed', 'first aggregate part is claimable'
);
select is(
  (select delivery_status from public.chat_messages where id = '74000000-0000-4000-8000-000000000002'),
  'pending', 'a partially sent message remains pending'
);
select is(
  (select discord_delivery_status from public.chat_conversations where id = '74000000-0000-4000-8000-000000000001'),
  'pending', 'a partially sent conversation remains pending'
);
select is(
  (select state from public.finish_chat_delivery_part(
    '74000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000010',
    '74000000-0000-4000-8000-000000000003', '74000000-0000-4000-8000-000000000011',
    'sent', '940000000000000002', null, null
  )),
  'sent', 'first aggregate part finishes sent'
);
select is(
  (select state from public.claim_next_chat_delivery_part(
    '74000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000010',
    '74000000-0000-4000-8000-000000000012', 60
  )),
  'claimed', 'second aggregate part becomes claimable after the first'
);
select is(
  (select state from public.finish_chat_delivery_part(
    '74000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000010',
    '74000000-0000-4000-8000-000000000004', '74000000-0000-4000-8000-000000000012',
    'sent', '940000000000000003', null, null
  )),
  'sent', 'second aggregate part finishes sent'
);
select is(
  (select delivery_status from public.chat_messages where id = '74000000-0000-4000-8000-000000000002'),
  'sent', 'all sent parts publish message sent'
);
select is(
  (select discord_delivery_status from public.chat_conversations where id = '74000000-0000-4000-8000-000000000001'),
  'sent', 'all sent parts publish conversation sent'
);

select * from finish();
rollback;
