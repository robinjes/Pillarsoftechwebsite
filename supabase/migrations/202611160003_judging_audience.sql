-- Parent results are released explicitly, independently of ending/locking an event.
alter table public.judging_events
  add column awards_message text not null default 'After all presentations',
  add column results_released boolean not null default false,
  add constraint judging_awards_message_length check (char_length(awards_message) <= 240),
  add constraint judging_released_scores_locked check (not results_released or scores_locked);

create or replace function public.judging_hide_results_on_unlock()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not new.scores_locked or (not old.is_current and new.is_current) then
    new.results_released := false;
  end if;
  return new;
end;
$$;
create trigger judging_hide_results_on_unlock
before update on public.judging_events
for each row execute function public.judging_hide_results_on_unlock();

create or replace function public.judging_control_audience(p_event_id uuid, p_awards_message text default null, p_released boolean default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  event public.judging_events%rowtype;
begin
  select * into event from public.judging_events where id = p_event_id for update;
  if not found then raise exception 'Event unavailable' using errcode = 'P0002'; end if;
  if p_released is true and not event.scores_locked then
    raise exception 'Lock scores before releasing results.' using errcode = 'P0001';
  end if;
  update public.judging_events
  set awards_message = coalesce(p_awards_message, awards_message),
      results_released = coalesce(p_released, results_released)
  where id = p_event_id;
end;
$$;

revoke all on function public.judging_hide_results_on_unlock() from public, anon, authenticated;
revoke all on function public.judging_control_audience(uuid, text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.judging_control_audience(uuid, text, boolean) to service_role;
