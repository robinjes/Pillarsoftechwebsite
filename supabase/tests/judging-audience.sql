begin;
set local search_path = public, extensions;
select plan(12);

select has_column('public', 'judging_events', 'results_released', 'release status is persisted');
select ok(not has_function_privilege('anon', 'public.judging_control_audience(uuid,text,boolean)', 'EXECUTE'), 'anonymous visitors cannot release results');
select ok(not has_function_privilege('authenticated', 'public.judging_control_audience(uuid,text,boolean)', 'EXECUTE'), 'browser users cannot bypass staff authorization');
select ok(has_function_privilege('service_role', 'public.judging_control_audience(uuid,text,boolean)', 'EXECUTE'), 'authorized server can release results');

insert into public.judging_events (id, title) values ('00000000-0000-4000-8000-0000000000e7', 'Audience test');
select is((select results_released from public.judging_events where id = '00000000-0000-4000-8000-0000000000e7'), false, 'results default to hidden');
select throws_ok($$select public.judging_control_audience('00000000-0000-4000-8000-0000000000e7', null, true)$$, 'P0001', null, 'scores must lock before release');
update public.judging_events set scores_locked = true where id = '00000000-0000-4000-8000-0000000000e7';
select is((select results_released from public.judging_events where id = '00000000-0000-4000-8000-0000000000e7'), false, 'locking does not release results');
select public.judging_control_audience('00000000-0000-4000-8000-0000000000e7', 'Awards at the end', true);
select is((select results_released from public.judging_events where id = '00000000-0000-4000-8000-0000000000e7'), true, 'explicit release publishes results');
select is((select awards_message from public.judging_events where id = '00000000-0000-4000-8000-0000000000e7'), 'Awards at the end', 'awards information is saved');
update public.judging_events set scores_locked = false where id = '00000000-0000-4000-8000-0000000000e7';
select is((select results_released from public.judging_events where id = '00000000-0000-4000-8000-0000000000e7'), false, 'unlocking hides results');
update public.judging_events set scores_locked = true where id = '00000000-0000-4000-8000-0000000000e7';
select public.judging_control_audience('00000000-0000-4000-8000-0000000000e7', null, true);
select public.judging_set_current_event('00000000-0000-4000-8000-0000000000e7');
select is((select results_released from public.judging_events where id = '00000000-0000-4000-8000-0000000000e7'), false, 'reopening an event hides old results');
select throws_ok($$select public.judging_control_audience('00000000-0000-4000-8000-0000000000e7', repeat('x', 241), null)$$, '23514', null, 'awards information stays within its length limit');

select * from finish();
rollback;
