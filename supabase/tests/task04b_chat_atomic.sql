-- Task 04B forward migration contract tests.
--
-- These checks are intentionally separate from task04a_chat.sql: the latter
-- covers the original storage foundation, while this file covers the new
-- queue lease and client-message idempotency boundary.
begin;
select plan(20);

select has_column('public', 'chat_queue_state', 'queue_expires_at', 'queue state has a daily expiry column');
select has_column('public', 'chat_messages', 'client_message_id', 'messages have a client idempotency key');
select ok(exists(
  select 1 from pg_indexes
  where schemaname = 'public'
    and indexname = 'chat_messages_conversation_client_message_key'
    and indexdef ilike '%unique%'
    and indexdef ilike '%conversation_id%'
    and indexdef ilike '%client_message_id%'
), 'client message key is unique within a conversation');
select ok(exists(
  select 1 from pg_constraint
  where conrelid = 'public.chat_queue_state'::regclass
    and conname = 'chat_queue_state_expiry_format'
), 'queue expiry is bounded after the queue update timestamp');

select has_function(
  'public', 'insert_chat_visitor_conversation', array['text', 'text', 'text', 'boolean', 'boolean'],
  'atomic visitor conversation RPC has the explicit signature'
);
select has_function(
  'public', 'insert_chat_visitor_message', array['uuid', 'text', 'uuid', 'text'],
  'idempotent visitor message RPC has the explicit signature'
);
select has_function(
  'public', 'insert_chat_visitor_message', array['uuid', 'text', 'text'],
  'legacy visitor message RPC remains available for deployed callers'
);

select ok(
  has_function_privilege('service_role', 'public.insert_chat_visitor_conversation(text,text,text,boolean,boolean)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.insert_chat_visitor_conversation(text,text,text,boolean,boolean)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.insert_chat_visitor_conversation(text,text,text,boolean,boolean)', 'EXECUTE'),
  'conversation RPC is callable only by service_role'
);
select ok(
  has_function_privilege('service_role', 'public.insert_chat_visitor_message(uuid,text,uuid,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.insert_chat_visitor_message(uuid,text,uuid,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.insert_chat_visitor_message(uuid,text,uuid,text)', 'EXECUTE'),
  'idempotent message RPC is callable only by service_role'
);

select ok(
  (select prosecdef from pg_proc where oid = 'public.insert_chat_visitor_conversation(text,text,text,boolean,boolean)'::regprocedure)
  and (select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.insert_chat_visitor_conversation(text,text,text,boolean,boolean)'::regprocedure),
  'conversation RPC is a locked-down security definer'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.insert_chat_visitor_message(uuid,text,uuid,text)'::regprocedure)
  and (select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.insert_chat_visitor_message(uuid,text,uuid,text)'::regprocedure),
  'idempotent message RPC is a locked-down security definer'
);

select ok(
  position('for update' in lower(pg_get_functiondef('public.insert_chat_visitor_conversation(text,text,text,boolean,boolean)'::regprocedure))) > 0
  and position('public.chat_queue_state' in lower(pg_get_functiondef('public.insert_chat_visitor_conversation(text,text,text,boolean,boolean)'::regprocedure))) > 0
  and position('public.chat_conversations' in lower(pg_get_functiondef('public.insert_chat_visitor_conversation(text,text,text,boolean,boolean)'::regprocedure))) > 0,
  'conversation creation visibly locks queue and conversation state'
);
select ok(
  position('from public.chat_queue_state' in lower(pg_get_functiondef('public.insert_chat_visitor_conversation(text,text,text,boolean,boolean)'::regprocedure)))
  < position('from public.chat_conversations' in lower(pg_get_functiondef('public.insert_chat_visitor_conversation(text,text,text,boolean,boolean)'::regprocedure))),
  'conversation creation keeps queue-before-conversation lock order'
);
select ok(
  position('from public.chat_queue_state' in lower(pg_get_functiondef('public.insert_chat_visitor_message(uuid,text,uuid,text)'::regprocedure)))
  < position('from public.chat_conversations' in lower(pg_get_functiondef('public.insert_chat_visitor_message(uuid,text,uuid,text)'::regprocedure))),
  'message insertion keeps queue-before-conversation lock order'
);
select ok(
  position('client_message_id' in lower(pg_get_functiondef('public.insert_chat_visitor_message(uuid,text,uuid,text)'::regprocedure))) > 0
  and position('p0005' in lower(pg_get_functiondef('public.insert_chat_visitor_message(uuid,text,uuid,text)'::regprocedure))) > 0,
  'message RPC contains scoped replay and conflict handling'
);
select ok(
  position('queue_expires_at' in lower(pg_get_functiondef('public.insert_chat_visitor_conversation(text,text,text,boolean,boolean)'::regprocedure))) > 0
  and position('22:00' in lower(pg_get_functiondef('public.insert_chat_visitor_conversation(text,text,text,boolean,boolean)'::regprocedure))) > 0,
  'conversation RPC enforces the same-Pacific-day close'
);

select throws_ok(
  $$select * from public.insert_chat_visitor_conversation(
    repeat('a', 64), 'Independent child', '', true, true
  )$$,
  'P0004', 'under-13 chat requires a parent or guardian',
  'under-13 creation rejects an attestation checkbox without a guardian flow'
);
select throws_ok(
  $$select * from public.insert_chat_visitor_message(
    '00000000-0000-4000-8000-000000000001', repeat('a', 64), null::uuid, 'Missing key'
  )$$,
  '22023', 'invalid chat message',
  'message creation rejects a missing client idempotency key'
);
select ok(exists(
  select 1 from pg_constraint
  where conrelid = 'public.chat_conversations'::regclass
    and conname = 'chat_conversations_guardian_check'
), 'guardian attestation storage invariant remains present for approved guardian flows');
select ok(
  not has_table_privilege('anon', 'public.chat_queue_state', 'SELECT')
  and not has_table_privilege('authenticated', 'public.chat_queue_state', 'SELECT')
  and not has_table_privilege('anon', 'public.chat_messages', 'SELECT')
  and not has_table_privilege('authenticated', 'public.chat_messages', 'SELECT'),
  'new visitor paths do not grant direct browser table access'
);

select * from finish();
rollback;
