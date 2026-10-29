-- Event feedback storage, question editing, and privilege contract tests.
begin;
set local search_path = public, extensions;
select plan(28);

select has_table('public', 'feedback_forms', 'feedback forms table exists');
select has_table('public', 'feedback_questions', 'feedback questions table exists');
select has_table('public', 'feedback_responses', 'feedback responses table exists');
select has_function('public', 'feedback_set_current_form', array['uuid'], 'current-form RPC exists');
select has_function('public', 'feedback_replace_questions', array['uuid', 'jsonb'], 'question replacement RPC exists');

select ok((select relforcerowsecurity from pg_class where oid = 'public.feedback_forms'::regclass), 'form RLS is forced');
select ok((select relforcerowsecurity from pg_class where oid = 'public.feedback_questions'::regclass), 'question RLS is forced');
select ok((select relforcerowsecurity from pg_class where oid = 'public.feedback_responses'::regclass), 'response RLS is forced');

select ok(not has_table_privilege('anon', 'public.feedback_forms', 'SELECT'), 'anon cannot read forms directly');
select ok(not has_table_privilege('anon', 'public.feedback_responses', 'SELECT'), 'anon cannot read responses');
select ok(not has_table_privilege('anon', 'public.feedback_responses', 'INSERT'), 'anon cannot insert responses directly');
select ok(not has_table_privilege('authenticated', 'public.feedback_responses', 'SELECT'), 'authenticated cannot read responses');
select ok(not has_table_privilege('service_role', 'public.feedback_responses', 'UPDATE'), 'responses are never edited after submission');
select ok(not has_function_privilege('anon', 'public.feedback_replace_questions(uuid, jsonb)', 'EXECUTE'), 'anon cannot edit questions');
select ok(not has_function_privilege('authenticated', 'public.feedback_set_current_form(uuid)', 'EXECUTE'), 'authenticated cannot switch forms');

insert into public.feedback_forms (id, title) values
  ('00000000-0000-4000-8000-0000000000f1', 'Career Panel'),
  ('00000000-0000-4000-8000-0000000000f2', 'Next Panel');
select lives_ok($$ select public.feedback_set_current_form('00000000-0000-4000-8000-0000000000f1') $$, 'a form can be made current');
select lives_ok($$ select public.feedback_set_current_form('00000000-0000-4000-8000-0000000000f2') $$, 'switching current form succeeds');
select is((select count(*) from public.feedback_forms where is_current), 1::bigint, 'only one form is current');

select lives_ok($$ select public.feedback_replace_questions('00000000-0000-4000-8000-0000000000f2', '[
  {"kind": "rating", "prompt": "Overall rating", "required": true},
  {"kind": "single_choice", "prompt": "Grade", "options": ["9", "10"]},
  {"kind": "long_text", "prompt": "Comments"}
]'::jsonb) $$, 'questions can be created as a list');
select is((select count(*) from public.feedback_questions where form_id = '00000000-0000-4000-8000-0000000000f2'), 3::bigint, 'three questions exist');
select is((select prompt from public.feedback_questions where form_id = '00000000-0000-4000-8000-0000000000f2' and position = 2), 'Comments', 'positions follow array order');

-- Keep "Overall rating" (by id), drop the others, add one new question first.
select lives_ok(format($$ select public.feedback_replace_questions('00000000-0000-4000-8000-0000000000f2', '[
  {"kind": "short_text", "prompt": "Your school"},
  {"id": "%s", "kind": "rating", "prompt": "Overall rating (edited)", "required": true}
]'::jsonb) $$, (select id from public.feedback_questions where prompt = 'Overall rating')), 'questions can be edited, reordered, and removed');
select is((select count(*) from public.feedback_questions where form_id = '00000000-0000-4000-8000-0000000000f2'), 2::bigint, 'removed questions are deleted');
select is((select position from public.feedback_questions where prompt = 'Overall rating (edited)'), 1, 'kept question moves to its new position');

select throws_ok($$ select public.feedback_replace_questions('00000000-0000-4000-8000-0000000000f2', '[{"kind": "single_choice", "prompt": "Only one option", "options": ["a"]}]'::jsonb) $$, '23514', null, 'choice questions need at least two options');
select throws_ok($$ select public.feedback_replace_questions('00000000-0000-4000-8000-0000000000f2', '[{"id": "00000000-0000-4000-8000-0000000000ee", "kind": "rating", "prompt": "Stolen"}]'::jsonb) $$, 'P0002', null, 'questions from other forms cannot be edited');

insert into public.feedback_responses (form_id, answers, visitor_token_digest)
values ('00000000-0000-4000-8000-0000000000f2', '{}'::jsonb, repeat('a', 64));
select throws_ok($$ insert into public.feedback_responses (form_id, answers, visitor_token_digest) values ('00000000-0000-4000-8000-0000000000f2', '{}'::jsonb, repeat('a', 64)) $$, '23505', null, 'one response per device per form');

delete from public.feedback_forms where id = '00000000-0000-4000-8000-0000000000f2';
select is((select count(*) from public.feedback_responses where form_id = '00000000-0000-4000-8000-0000000000f2'), 0::bigint, 'deleting a form removes its responses');

select * from finish();
rollback;
