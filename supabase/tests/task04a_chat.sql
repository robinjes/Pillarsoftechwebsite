-- Task 04A chat storage, schedule, and privilege contract tests.
begin;
select plan(77);

select has_table('public', 'chat_conversations', 'chat conversations table exists');
select has_table('public', 'chat_messages', 'chat messages table exists');
select has_table('public', 'chat_office_hours', 'chat office-hours table exists');
select has_table('public', 'chat_queue_state', 'chat queue state table exists');
select has_table('public', 'staff_discord_identities', 'staff Discord mapping table exists');
select has_table('public', 'chat_rate_limit_buckets', 'Task 3 shared rate-limit table is reused');
select has_function('public', 'consume_chat_rate_limit', array['text', 'integer', 'integer'], 'Task 3 shared rate-limit RPC is reused');

select ok((select relrowsecurity from pg_class where oid = 'public.chat_conversations'::regclass), 'conversation RLS is enabled');
select ok((select relforcerowsecurity from pg_class where oid = 'public.chat_conversations'::regclass), 'conversation RLS is forced');
select ok((select relforcerowsecurity from pg_class where oid = 'public.chat_messages'::regclass), 'message RLS is forced');
select ok((select relforcerowsecurity from pg_class where oid = 'public.chat_office_hours'::regclass), 'office-hours RLS is forced');
select ok((select relforcerowsecurity from pg_class where oid = 'public.chat_queue_state'::regclass), 'queue RLS is forced');
select ok((select relforcerowsecurity from pg_class where oid = 'public.staff_discord_identities'::regclass), 'Discord mapping RLS is forced');

select is((select count(*) from public.chat_office_hours), 5::bigint, 'exactly five canonical schedule rows are seeded');
select is((select count(*) from public.chat_office_hours where weekday between 1 and 5 and open_time = '16:00' and close_time = '22:00' and timezone = 'America/Los_Angeles' and enabled), 5::bigint, 'schedule is Monday-Friday 16:00-22:00 Pacific');
select is((select count(*) from public.chat_office_hours where weekday in (6, 7)), 0::bigint, 'weekends are not seeded');
select is((select queue_open from public.chat_queue_state where singleton_key = 'default'), false, 'queue seed is closed');
select is((select count(*) from public.chat_queue_state), 1::bigint, 'queue has one singleton row');

select ok(exists(select 1 from pg_constraint where conname = 'chat_conversations_token_digest_format'), 'conversation digest is bounded and keyed');
select ok(exists(select 1 from pg_constraint where conname = 'chat_conversations_display_name_length'), 'conversation display name is bounded');
select ok(exists(select 1 from pg_constraint where conname = 'chat_conversations_guardian_check'), 'under-13 guardian attestation is constrained');
select ok(exists(select 1 from pg_constraint where conname = 'chat_messages_body_length'), 'message body length is bounded');
select ok(exists(select 1 from pg_constraint where conname = 'chat_messages_plain_text_check'), 'message body rejects angle-bracket markup');
select ok(exists(select 1 from pg_constraint where conname = 'chat_messages_delivery_attempts_bounded'), 'delivery retries are bounded');

select ok(exists(select 1 from pg_indexes where indexname = 'chat_conversations_active_created_at_id_idx' and indexdef ilike '% where %'), 'active conversation index is partial');
select ok(exists(select 1 from pg_indexes where indexname = 'chat_messages_failed_retry_idx' and indexdef ilike '% where %'), 'failed message retry index is partial');
select ok(exists(select 1 from pg_indexes where indexname = 'chat_messages_pending_delivery_idx' and indexdef ilike '% where %'), 'pending message index is partial');
select ok(exists(select 1 from pg_indexes where indexname = 'chat_conversations_terminal_retention_idx' and indexdef ilike '% where %'), 'terminal retention index is partial');

select ok(exists(
  select 1 from pg_constraint
  where conrelid = 'public.staff_discord_identities'::regclass
    and contype = 'f'
    and confrelid = 'public.staff_members'::regclass
), 'Discord mapping user_id references staff_members');

select ok(not has_table_privilege('anon', 'public.chat_conversations', 'SELECT'), 'anon cannot read conversations');
select ok(not has_table_privilege('authenticated', 'public.chat_conversations', 'SELECT'), 'authenticated cannot read conversations');
select ok(not has_table_privilege('anon', 'public.chat_messages', 'SELECT'), 'anon cannot read messages');
select ok(not has_table_privilege('authenticated', 'public.chat_messages', 'SELECT'), 'authenticated cannot read messages');
select ok(not has_table_privilege('anon', 'public.chat_office_hours', 'SELECT'), 'anon cannot read office hours directly');
select ok(not has_table_privilege('authenticated', 'public.chat_office_hours', 'SELECT'), 'authenticated cannot read office hours directly');
select ok(not has_table_privilege('anon', 'public.chat_queue_state', 'SELECT'), 'anon cannot read queue state directly');
select ok(not has_table_privilege('authenticated', 'public.chat_queue_state', 'SELECT'), 'authenticated cannot read queue state directly');
select ok(not has_table_privilege('anon', 'public.staff_discord_identities', 'SELECT'), 'anon cannot read Discord mappings');
select ok(not has_table_privilege('authenticated', 'public.staff_discord_identities', 'SELECT'), 'authenticated cannot read Discord mappings');
select ok(not has_table_privilege('anon', 'public.chat_rate_limit_buckets', 'SELECT'), 'anon cannot read shared rate-limit buckets');
select ok(not has_table_privilege('authenticated', 'public.chat_rate_limit_buckets', 'SELECT'), 'authenticated cannot read shared rate-limit buckets');

select ok(has_table_privilege('service_role', 'public.chat_conversations', 'SELECT'), 'service role can read conversations');
select ok(has_table_privilege('service_role', 'public.chat_conversations', 'INSERT'), 'service role can insert conversations');
select ok(has_table_privilege('service_role', 'public.chat_messages', 'INSERT'), 'service role can insert messages');
select ok(has_table_privilege('service_role', 'public.chat_messages', 'UPDATE'), 'service role can update delivery state');
select ok(has_table_privilege('service_role', 'public.chat_office_hours', 'SELECT'), 'service role can read office hours');
select ok(has_table_privilege('service_role', 'public.chat_queue_state', 'UPDATE'), 'service role can update queue state');
select ok(has_table_privilege('service_role', 'public.staff_discord_identities', 'SELECT'), 'service role can read Discord mappings');
select ok(not has_table_privilege('service_role', 'public.staff_members', 'INSERT'), 'service role cannot insert staff membership');
select ok(not has_table_privilege('service_role', 'public.staff_members', 'UPDATE'), 'service role cannot update staff membership');
select ok(not has_table_privilege('service_role', 'public.staff_members', 'DELETE'), 'service role cannot delete staff membership');

select has_function(
  'public', 'insert_chat_visitor_message', array['uuid', 'text', 'text'],
  'production atomic visitor-message RPC has an explicit signature'
);
select has_function(
  'public', 'chat_test_insert_visitor_message', array['uuid', 'text', 'text', 'timestamptz'],
  'revoked deterministic visitor-message test helper has a distinct signature'
);
select ok(
  (select proargdefaults is null
   from pg_proc
   where oid = 'public.insert_chat_visitor_message(uuid,text,text)'::regprocedure),
  'production visitor-message RPC has no defaulted arguments'
);
select ok(
  (select proargdefaults is null
   from pg_proc
   where oid = 'public.chat_test_insert_visitor_message(uuid,text,text,timestamptz)'::regprocedure),
  'test helper has no defaulted arguments'
);
select ok(
  has_function_privilege('service_role', 'public.insert_chat_visitor_message(uuid,text,text)', 'EXECUTE'),
  'service role can execute only the production visitor-message RPC'
);
select ok(
  not has_function_privilege('service_role', 'public.chat_test_insert_visitor_message(uuid,text,text,timestamptz)', 'EXECUTE'),
  'service role cannot execute the deterministic test helper'
);
select ok(
  not has_function_privilege('anon', 'public.insert_chat_visitor_message(uuid,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.chat_test_insert_visitor_message(uuid,text,text,timestamptz)', 'EXECUTE'),
  'anonymous callers cannot execute either visitor-message function'
);
select ok(
  not has_function_privilege('authenticated', 'public.insert_chat_visitor_message(uuid,text,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.chat_test_insert_visitor_message(uuid,text,text,timestamptz)', 'EXECUTE'),
  'authenticated callers cannot execute either visitor-message function'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.insert_chat_visitor_message(uuid,text,text)'::regprocedure)
  and (select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.insert_chat_visitor_message(uuid,text,text)'::regprocedure),
  'production visitor-message RPC is a locked-down security definer'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.chat_test_insert_visitor_message(uuid,text,text,timestamptz)'::regprocedure)
  and (select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.chat_test_insert_visitor_message(uuid,text,text,timestamptz)'::regprocedure),
  'test helper is also a locked-down security definer'
);
select ok(
  position('for update' in lower(pg_get_functiondef('public.insert_chat_visitor_message(uuid,text,text)'::regprocedure))) > 0
  and position('public.chat_queue_state' in lower(pg_get_functiondef('public.insert_chat_visitor_message(uuid,text,text)'::regprocedure))) > 0
  and position('public.chat_conversations' in lower(pg_get_functiondef('public.insert_chat_visitor_message(uuid,text,text)'::regprocedure))) > 0,
  'production RPC visibly locks queue and conversation rows'
);
select ok(
  position('from public.chat_queue_state' in lower(pg_get_functiondef('public.insert_chat_visitor_message(uuid,text,text)'::regprocedure)))
  < position('from public.chat_conversations' in lower(pg_get_functiondef('public.insert_chat_visitor_message(uuid,text,text)'::regprocedure))),
  'production RPC keeps queue-before-conversation lock order'
);

insert into public.chat_conversations (
  id, visitor_token_digest, display_name, email, is_under_13, guardian_attested,
  status, ownership_expires_at, terminal_at, discord_delivery_status,
  created_at, updated_at
) values
  (
    '00000000-0000-4000-8000-000000000101', repeat('a', 64), 'Open visitor', '', false, false,
    'open', '2026-09-25T12:00:00Z', null, 'pending',
    '2026-08-26T12:00:00Z', '2026-08-26T12:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000102', repeat('b', 64), 'Closed visitor', '', false, false,
    'closed', '2026-09-25T12:00:00Z', '2026-08-27T12:00:00Z', 'pending',
    '2026-08-26T12:00:00Z', '2026-08-27T12:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000103', repeat('c', 64), 'Spam visitor', '', false, false,
    'spam', '2026-09-25T12:00:00Z', '2026-08-27T12:00:00Z', 'pending',
    '2026-08-26T12:00:00Z', '2026-08-27T12:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000104', repeat('d', 64), 'Expired visitor', '', false, false,
    'open', '2026-08-26T12:00:00Z', null, 'pending',
    '2026-08-25T12:00:00Z', '2026-08-25T12:00:00Z'
  );

update public.chat_queue_state
set queue_open = false
where singleton_key = 'default';
select throws_ok(
  $$select public.chat_test_insert_visitor_message(
    '00000000-0000-4000-8000-000000000101', repeat('a', 64), 'Queue closed',
    '2026-08-26T23:00:00Z'::timestamptz
  )$$,
  'P0003', 'chat is closed',
  'RPC rejects a closed queue before inserting a message'
);
update public.chat_queue_state
set queue_open = true
where singleton_key = 'default';

select throws_ok(
  $$select public.chat_test_insert_visitor_message(
    '00000000-0000-4000-8000-000000000101', repeat('a', 64), 'Before open',
    '2026-08-26T22:59:00Z'::timestamptz
  )$$,
  'P0003', 'chat is closed',
  '15:59 Pacific is closed'
);
select lives_ok(
  $$select public.chat_test_insert_visitor_message(
    '00000000-0000-4000-8000-000000000101', repeat('a', 64), 'At open',
    '2026-08-26T23:00:00Z'::timestamptz
  )$$,
  '16:00 Pacific is open'
);
select is(
  (select delivery_status from public.chat_messages
   where conversation_id = '00000000-0000-4000-8000-000000000101'
   order by created_at asc, id asc limit 1),
  'pending',
  'successful visitor insert is pending'
);
select is(
  (select count(*) from public.chat_messages where conversation_id = '00000000-0000-4000-8000-000000000101'),
  1::bigint,
  '16:00 call inserts exactly one message'
);
select lives_ok(
  $$select public.chat_test_insert_visitor_message(
    '00000000-0000-4000-8000-000000000101', repeat('a', 64), 'Before close',
    '2026-08-27T04:59:00Z'::timestamptz
  )$$,
  '21:59 Pacific is open'
);
select is(
  (select count(*) from public.chat_messages where conversation_id = '00000000-0000-4000-8000-000000000101'),
  2::bigint,
  '21:59 call adds one and only one message'
);
select throws_ok(
  $$select public.chat_test_insert_visitor_message(
    '00000000-0000-4000-8000-000000000101', repeat('a', 64), 'At close',
    '2026-08-27T05:00:00Z'::timestamptz
  )$$,
  'P0003', 'chat is closed',
  '22:00 Pacific is closed'
);
select throws_ok(
  $$select public.chat_test_insert_visitor_message(
    '00000000-0000-4000-8000-000000000101', repeat('a', 64), 'Weekend',
    '2026-08-30T00:00:00Z'::timestamptz
  )$$,
  'P0003', 'chat is closed',
  'Saturday Pacific is closed'
);
select throws_ok(
  $$select public.chat_test_insert_visitor_message(
    '00000000-0000-4000-8000-000000000101', repeat('a', 64), 'Weekend Sunday',
    '2026-08-31T00:00:00Z'::timestamptz
  )$$,
  'P0003', 'chat is closed',
  'Sunday Pacific is closed'
);
select throws_ok(
  $$select public.chat_test_insert_visitor_message(
    '00000000-0000-4000-8000-000000000102', repeat('b', 64), 'Closed conversation',
    '2026-08-26T23:00:00Z'::timestamptz
  )$$,
  'P0003', 'chat is closed',
  'closed conversations cannot receive visitor messages'
);
select throws_ok(
  $$select public.chat_test_insert_visitor_message(
    '00000000-0000-4000-8000-000000000103', repeat('c', 64), 'Spam conversation',
    '2026-08-26T23:00:00Z'::timestamptz
  )$$,
  'P0003', 'chat is closed',
  'spam conversations cannot receive visitor messages'
);
select throws_ok(
  $$select public.chat_test_insert_visitor_message(
    '00000000-0000-4000-8000-000000000104', repeat('d', 64), 'Expired conversation',
    '2026-08-26T23:00:00Z'::timestamptz
  )$$,
  'P0002', 'chat conversation was not found',
  'expired ownership is rejected as not found'
);
select throws_ok(
  $$select public.chat_test_insert_visitor_message(
    '00000000-0000-4000-8000-000000000101', repeat('e', 64), 'Foreign digest',
    '2026-08-26T23:00:00Z'::timestamptz
  )$$,
  'P0002', 'chat conversation was not found',
  'a foreign digest cannot write the conversation'
);

select * from finish();
rollback;
