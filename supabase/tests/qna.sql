-- Live audience Q&A storage, vote, and privilege contract tests.
begin;
set local search_path = public, extensions;
select plan(32);

select has_table('public', 'qna_sessions', 'Q&A sessions table exists');
select has_table('public', 'qna_questions', 'Q&A questions table exists');
select has_table('public', 'qna_votes', 'Q&A votes table exists');
select has_function('public', 'qna_set_upvote', array['uuid', 'text', 'boolean'], 'upvote RPC exists');
select has_function('public', 'qna_set_current_session', array['uuid'], 'current-session RPC exists');

select ok((select relforcerowsecurity from pg_class where oid = 'public.qna_sessions'::regclass), 'session RLS is forced');
select ok((select relforcerowsecurity from pg_class where oid = 'public.qna_questions'::regclass), 'question RLS is forced');
select ok((select relforcerowsecurity from pg_class where oid = 'public.qna_votes'::regclass), 'vote RLS is forced');

select ok(not has_table_privilege('anon', 'public.qna_sessions', 'SELECT'), 'anon cannot read sessions directly');
select ok(not has_table_privilege('anon', 'public.qna_questions', 'SELECT'), 'anon cannot read questions directly');
select ok(not has_table_privilege('anon', 'public.qna_questions', 'INSERT'), 'anon cannot insert questions directly');
select ok(not has_table_privilege('anon', 'public.qna_votes', 'SELECT'), 'anon cannot read votes');
select ok(not has_table_privilege('authenticated', 'public.qna_questions', 'SELECT'), 'authenticated cannot read questions directly');
select ok(not has_table_privilege('authenticated', 'public.qna_votes', 'INSERT'), 'authenticated cannot insert votes');
select ok(not has_function_privilege('anon', 'public.qna_set_upvote(uuid, text, boolean)', 'EXECUTE'), 'anon cannot call upvote RPC');
select ok(not has_function_privilege('authenticated', 'public.qna_set_current_session(uuid)', 'EXECUTE'), 'authenticated cannot switch sessions');
select ok(has_function_privilege('service_role', 'public.qna_set_upvote(uuid, text, boolean)', 'EXECUTE'), 'service role can call upvote RPC');

insert into public.qna_sessions (id, title) values
  ('00000000-0000-4000-8000-0000000000a1', 'Career Panel'),
  ('00000000-0000-4000-8000-0000000000a2', 'Second Panel');
select lives_ok($$ select public.qna_set_current_session('00000000-0000-4000-8000-0000000000a1') $$, 'a session can be made current');
select lives_ok($$ select public.qna_set_current_session('00000000-0000-4000-8000-0000000000a2') $$, 'switching current session succeeds');
select is((select count(*) from public.qna_sessions where is_current), 1::bigint, 'only one session is current');
select is((select id from public.qna_sessions where is_current), '00000000-0000-4000-8000-0000000000a2'::uuid, 'the newly chosen session is current');

insert into public.qna_questions (id, session_id, body, visitor_token_digest) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a2', 'How did you get started?', repeat('a', 64));

select is(public.qna_set_upvote('00000000-0000-4000-8000-0000000000b1', repeat('b', 64), true), 1, 'first upvote counts');
select is(public.qna_set_upvote('00000000-0000-4000-8000-0000000000b1', repeat('b', 64), true), 1, 'repeat upvote is idempotent');
select is(public.qna_set_upvote('00000000-0000-4000-8000-0000000000b1', repeat('c', 64), true), 2, 'a second visitor adds a vote');
select is(public.qna_set_upvote('00000000-0000-4000-8000-0000000000b1', repeat('b', 64), false), 1, 'removing a vote decrements');
select is(public.qna_set_upvote('00000000-0000-4000-8000-0000000000b1', repeat('b', 64), false), 1, 'repeat removal is idempotent');
select throws_ok($$ select public.qna_set_upvote('00000000-0000-4000-8000-0000000000b1', 'not-a-digest', true) $$, '22023', null, 'malformed digests are rejected');

update public.qna_questions set status = 'hidden' where id = '00000000-0000-4000-8000-0000000000b1';
select throws_ok($$ select public.qna_set_upvote('00000000-0000-4000-8000-0000000000b1', repeat('d', 64), true) $$, 'P0002', null, 'hidden questions cannot be upvoted');

select throws_ok($$ insert into public.qna_questions (session_id, body, visitor_token_digest) values ('00000000-0000-4000-8000-0000000000a2', 'no', repeat('a', 64)) $$, '23514', null, 'too-short questions are rejected');
select throws_ok($$ insert into public.qna_questions (session_id, body, status, visitor_token_digest) values ('00000000-0000-4000-8000-0000000000a2', 'A fine question', 'pinned', repeat('a', 64)) $$, '23514', null, 'unknown statuses are rejected');

-- Deleting a session from the host's Past sessions list removes everything under it.
delete from public.qna_sessions where id = '00000000-0000-4000-8000-0000000000a2';
select is((select count(*) from public.qna_questions where session_id = '00000000-0000-4000-8000-0000000000a2'), 0::bigint, 'deleting a session removes its questions');
select is((select count(*) from public.qna_votes where question_id = '00000000-0000-4000-8000-0000000000b1'), 0::bigint, 'deleting a session removes its votes');

select * from finish();
rollback;
