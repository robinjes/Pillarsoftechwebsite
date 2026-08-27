-- Task 04A chat storage, schedule, and privilege contract tests.
begin;
select plan(51);

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

select * from finish();
rollback;
