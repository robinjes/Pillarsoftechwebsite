begin;
set local search_path = public, extensions;
select plan(17);

select has_column('public', 'judging_events', 'timer_phase', 'timer phase is persisted');
select has_column('public', 'judging_events', 'timer_ends_at', 'timer deadline is persisted');
select has_column('public', 'judging_events', 'timer_remaining_seconds', 'paused time is persisted');
select ok(not has_function_privilege('anon', 'public.judging_control_timer(uuid,uuid,text)', 'EXECUTE'), 'anonymous users cannot control timers');
select ok(not has_function_privilege('authenticated', 'public.judging_control_timer(uuid,uuid,text)', 'EXECUTE'), 'browser users cannot bypass host authorization');
select ok(has_function_privilege('service_role', 'public.judging_control_timer(uuid,uuid,text)', 'EXECUTE'), 'authorized server can control timers');

insert into public.judging_events (id, title) values ('00000000-0000-4000-8000-0000000000e9', 'Timer test');
select public.judging_set_current_event('00000000-0000-4000-8000-0000000000e9');
select throws_ok($$select public.judging_control_timer('00000000-0000-4000-8000-0000000000e9', null, 'pitch')$$, 'P0001', null, 'a student must be selected');
insert into public.judging_contestants (id, event_id, name) values
 ('00000000-0000-4000-8000-0000000000c8', '00000000-0000-4000-8000-0000000000e9', 'First'),
 ('00000000-0000-4000-8000-0000000000c9', '00000000-0000-4000-8000-0000000000e9', 'Second');
update public.judging_events set current_contestant_id = '00000000-0000-4000-8000-0000000000c8' where id = '00000000-0000-4000-8000-0000000000e9';
select lives_ok($$select public.judging_control_timer('00000000-0000-4000-8000-0000000000e9', '00000000-0000-4000-8000-0000000000c8', 'pitch')$$, 'host starts pitch');
select ok((select timer_ends_at between clock_timestamp() + interval '118 seconds' and clock_timestamp() + interval '121 seconds' from public.judging_events where id = '00000000-0000-4000-8000-0000000000e9'), 'pitch deadline is two minutes away');
select is((select timer_phase from public.judging_events where id = '00000000-0000-4000-8000-0000000000e9'), 'pitch', 'pitch mode is saved');
select public.judging_control_timer('00000000-0000-4000-8000-0000000000e9', '00000000-0000-4000-8000-0000000000c8', 'pause');
select is((select timer_ends_at from public.judging_events where id = '00000000-0000-4000-8000-0000000000e9'), null::timestamptz, 'pause clears deadline');
select public.judging_control_timer('00000000-0000-4000-8000-0000000000e9', '00000000-0000-4000-8000-0000000000c8', 'resume');
select ok((select timer_ends_at is not null from public.judging_events where id = '00000000-0000-4000-8000-0000000000e9'), 'resume restores deadline');
select public.judging_control_timer('00000000-0000-4000-8000-0000000000e9', '00000000-0000-4000-8000-0000000000c8', 'qa');
select is((select timer_phase from public.judging_events where id = '00000000-0000-4000-8000-0000000000e9'), 'qa', 'Q&A starts separately');
select is((select timer_remaining_seconds from public.judging_events where id = '00000000-0000-4000-8000-0000000000e9'), 60, 'Q&A gets one minute');
update public.judging_events set current_contestant_id = '00000000-0000-4000-8000-0000000000c9' where id = '00000000-0000-4000-8000-0000000000e9';
select is((select timer_phase from public.judging_events where id = '00000000-0000-4000-8000-0000000000e9'), null::text, 'changing students resets the timer');
select throws_ok($$select public.judging_control_timer('00000000-0000-4000-8000-0000000000e9', '00000000-0000-4000-8000-0000000000c8', 'pitch')$$, 'P0001', null, 'stale controls cannot time a different student');
select public.judging_control_timer('00000000-0000-4000-8000-0000000000e9', '00000000-0000-4000-8000-0000000000c9', 'pitch');
update public.judging_events set is_current = false where id = '00000000-0000-4000-8000-0000000000e9';
select is((select timer_phase from public.judging_events where id = '00000000-0000-4000-8000-0000000000e9'), null::text, 'ending the event resets the timer');

select * from finish();
rollback;
