-- Host-controlled deadlines shared by judges and broadcast viewers.
alter table public.judging_events
  add column timer_phase text,
  add column timer_ends_at timestamptz,
  add column timer_remaining_seconds integer not null default 0,
  add constraint judging_timer_valid check (
    timer_remaining_seconds between 0 and 120
    and (timer_phase is null or timer_phase in ('pitch', 'qa'))
    and (timer_phase is not null or (timer_ends_at is null and timer_remaining_seconds = 0))
    and (timer_phase is distinct from 'qa' or timer_remaining_seconds <= 60)
  );

create or replace function public.judging_reset_timer_on_student_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.current_contestant_id is distinct from old.current_contestant_id
     or (old.is_current and not new.is_current) then
    new.timer_phase := null;
    new.timer_ends_at := null;
    new.timer_remaining_seconds := 0;
  end if;
  return new;
end;
$$;
create trigger judging_reset_timer_on_student_change
before update on public.judging_events
for each row execute function public.judging_reset_timer_on_student_change();

create or replace function public.judging_control_timer(p_event_id uuid, p_contestant_id uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  event public.judging_events%rowtype;
  seconds integer;
  now_at timestamptz;
begin
  select * into event from public.judging_events where id = p_event_id for update;
  if not found then raise exception 'Event unavailable' using errcode = 'P0002'; end if;
  now_at := clock_timestamp();
  if event.current_contestant_id is distinct from p_contestant_id then
    raise exception 'Student changed. Refresh and try again.' using errcode = 'P0001';
  end if;
  if p_action = 'reset' then
    update public.judging_events set timer_phase = null, timer_ends_at = null, timer_remaining_seconds = 0 where id = p_event_id;
    return;
  end if;
  if not event.is_current or event.current_contestant_id is null then
    raise exception 'Select a student in an open event first.' using errcode = 'P0001';
  end if;
  if p_action in ('pitch', 'qa') then
    seconds := case when p_action = 'pitch' then 120 else 60 end;
    update public.judging_events set timer_phase = p_action, timer_ends_at = now_at + seconds * interval '1 second', timer_remaining_seconds = seconds where id = p_event_id;
  elsif p_action = 'pause' and event.timer_ends_at is not null then
    seconds := greatest(0, ceil(extract(epoch from event.timer_ends_at - now_at))::integer);
    update public.judging_events set timer_ends_at = null, timer_remaining_seconds = seconds where id = p_event_id;
  elsif p_action = 'resume' and event.timer_phase is not null and event.timer_ends_at is null and event.timer_remaining_seconds > 0 then
    update public.judging_events set timer_ends_at = now_at + event.timer_remaining_seconds * interval '1 second' where id = p_event_id;
  elsif p_action not in ('pause', 'resume') then
    raise exception 'Invalid timer action' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.judging_reset_timer_on_student_change() from public, anon, authenticated;
revoke all on function public.judging_control_timer(uuid, uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.judging_control_timer(uuid, uuid, text) to service_role;
