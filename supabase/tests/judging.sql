-- Live pitch judging storage and privilege contract tests.
begin;
set local search_path = public, extensions;
select plan(26);

select has_table('public', 'judging_events', 'judging events table exists');
select has_table('public', 'judging_contestants', 'contestants table exists');
select has_table('public', 'judging_judges', 'judges table exists');
select has_table('public', 'judging_scores', 'scores table exists');
select has_function('public', 'judging_set_current_event', array['uuid'], 'current-event RPC exists');

select ok((select relforcerowsecurity from pg_class where oid = 'public.judging_events'::regclass), 'event RLS is forced');
select ok((select relforcerowsecurity from pg_class where oid = 'public.judging_judges'::regclass), 'judge RLS is forced');
select ok((select relforcerowsecurity from pg_class where oid = 'public.judging_scores'::regclass), 'score RLS is forced');

select ok(not has_table_privilege('anon', 'public.judging_judges', 'SELECT'), 'anon cannot read judge codes');
select ok(not has_table_privilege('authenticated', 'public.judging_judges', 'SELECT'), 'authenticated cannot read judge codes');
select ok(not has_table_privilege('anon', 'public.judging_scores', 'SELECT'), 'anon cannot read scores');
select ok(not has_table_privilege('anon', 'public.judging_scores', 'INSERT'), 'anon cannot write scores directly');
select ok(not has_function_privilege('authenticated', 'public.judging_set_current_event(uuid)', 'EXECUTE'), 'authenticated cannot switch events');

insert into public.judging_events (id, title) values
  ('00000000-0000-4000-8000-0000000000e1', 'Wildcat Tank'),
  ('00000000-0000-4000-8000-0000000000e2', 'Second Tank');
select lives_ok($$ select public.judging_set_current_event('00000000-0000-4000-8000-0000000000e1') $$, 'an event can be made current');
select lives_ok($$ select public.judging_set_current_event('00000000-0000-4000-8000-0000000000e2') $$, 'switching current event succeeds');
select is((select count(*) from public.judging_events where is_current), 1::bigint, 'only one event is current');

insert into public.judging_contestants (id, event_id, name) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000e2', 'Jay');
insert into public.judging_judges (id, event_id, name, access_code) values
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000e2', 'Ms. Patel', 'K7P4QM');

select throws_ok($$ insert into public.judging_judges (event_id, name, access_code) values ('00000000-0000-4000-8000-0000000000e2', 'Copycat', 'K7P4QM') $$, '23505', null, 'access codes are unique');
select throws_ok($$ insert into public.judging_judges (event_id, name, access_code) values ('00000000-0000-4000-8000-0000000000e2', 'Bad code', 'k7p4qm') $$, '23514', null, 'access codes use the unambiguous uppercase alphabet');

insert into public.judging_scores (event_id, contestant_id, judge_id, problem, creativity)
values ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000d1', 8, 9);
select throws_ok($$ insert into public.judging_scores (event_id, contestant_id, judge_id) values ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000d1') $$, '23505', null, 'one rubric per judge per contestant');
select throws_ok($$ update public.judging_scores set pitch = 11 $$, '23514', null, 'scores stay between 1 and 10');
select throws_ok($$ update public.judging_scores set stem = 0 $$, '23514', null, 'zero is not a valid score');

update public.judging_events set current_contestant_id = '00000000-0000-4000-8000-0000000000c1' where id = '00000000-0000-4000-8000-0000000000e2';
delete from public.judging_contestants where id = '00000000-0000-4000-8000-0000000000c1';
select is((select current_contestant_id from public.judging_events where id = '00000000-0000-4000-8000-0000000000e2'), null::uuid, 'removing the current contestant clears the judges screen');
select is((select count(*) from public.judging_scores where contestant_id = '00000000-0000-4000-8000-0000000000c1'), 0::bigint, 'removing a contestant removes their scores');

delete from public.judging_events where id = '00000000-0000-4000-8000-0000000000e2';
select is((select count(*) from public.judging_judges where event_id = '00000000-0000-4000-8000-0000000000e2'), 0::bigint, 'deleting an event removes its judges');

select ok(exists(select 1 from pg_constraint where conname = 'judging_contestants_event_id_fkey'), 'contestant count embed hint names a real foreign key');
select ok(exists(select 1 from pg_constraint where conname = 'judging_judges_event_id_fkey'), 'judge count embed hint names a real foreign key');

select * from finish();
rollback;
