-- Task 05 API hardening. Browser clients use same-origin route handlers; these
-- checks keep the underlying RPC contract bounded for any future caller.

create or replace function public.register_for_event(p_event_id text)
returns public.volunteer_registrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.volunteer_registrations;
  event_row public.events;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_event_id is null or btrim(p_event_id) !~ '^[a-z0-9][a-z0-9_-]{0,63}$' then
    raise exception 'invalid event identifier' using errcode = '22023';
  end if;

  select * into event_row
  from public.events
  where id = p_event_id
    and publication_state = 'published'
    and volunteer_registration_state = 'open'
  for update;
  if not found then
    raise exception 'event is not open for volunteer registration' using errcode = '22023';
  end if;

  select * into result
  from public.volunteer_registrations
  where user_id = auth.uid() and event_id = p_event_id
  for update;
  if found then return result; end if;

  if event_row.volunteer_capacity is not null and (
    select count(*) from public.volunteer_registrations
    where event_id = p_event_id and status = 'registered'
  ) >= event_row.volunteer_capacity then
    raise exception 'event volunteer capacity is full' using errcode = '22023';
  end if;

  insert into public.volunteer_registrations (user_id, event_id)
  values (auth.uid(), p_event_id)
  returning * into result;
  return result;
end;
$$;

create or replace function public.cancel_event_registration(p_event_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_event_id is null or btrim(p_event_id) !~ '^[a-z0-9][a-z0-9_-]{0,63}$' then
    raise exception 'invalid event identifier' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.events
    where id = p_event_id
      and publication_state = 'published'
      and volunteer_registration_state = 'open'
      and (starts_at is null or starts_at > now())
  ) then
    raise exception 'event is not open for cancellation' using errcode = '22023';
  end if;

  delete from public.volunteer_registrations
  where user_id = auth.uid()
    and event_id = p_event_id
    and status = 'registered';
  get diagnostics deleted_count = row_count;
  if deleted_count = 0 then
    raise exception 'registration is not eligible for cancellation' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.staff_check_in_or_out(
  p_member_code text,
  p_event_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  volunteer public.profiles;
  event_row public.events;
  registration public.volunteer_registrations;
  active_session public.attendance_sessions;
  completed_session public.attendance_sessions;
  elapsed_hours numeric(8, 2);
  action_name text;
begin
  if not public.is_staff() then
    raise exception 'staff authorization required' using errcode = '42501';
  end if;
  if p_member_code is null or btrim(p_member_code) !~ '^POT-(?:[0-9]{6}|[A-F0-9]{16})$'
     or p_event_id is null or btrim(p_event_id) !~ '^[a-z0-9][a-z0-9_-]{0,63}$' then
    raise exception 'invalid attendance input' using errcode = '22023';
  end if;

  select * into event_row
  from public.events
  where id = p_event_id and publication_state = 'published'
  for update;
  if not found then
    raise exception 'event is not published' using errcode = '22023';
  end if;

  select * into volunteer
  from public.profiles
  where member_code = p_member_code
  for update;
  if not found then
    raise exception 'volunteer member code not found' using errcode = '22023';
  end if;

  select * into active_session
  from public.attendance_sessions
  where user_id = volunteer.id and check_out_at is null
  for update;

  insert into public.volunteer_registrations (user_id, event_id)
  values (volunteer.id, p_event_id)
  on conflict (user_id, event_id) do nothing;
  select * into registration
  from public.volunteer_registrations
  where user_id = volunteer.id and event_id = p_event_id
  for update;

  if registration.status in ('attended', 'absent') then
    raise exception 'attendance for this event is already finalized' using errcode = '22023';
  end if;

  if active_session.id is null then
    insert into public.attendance_sessions (user_id, event_id)
    values (volunteer.id, p_event_id)
    returning * into active_session;
    update public.volunteer_registrations
    set status = 'registered', checked_in_at = active_session.check_in_at
    where id = registration.id
    returning * into registration;
    action_name := 'checkedIn';
    return jsonb_build_object(
      'profile', to_jsonb(volunteer),
      'registration', to_jsonb(registration),
      'action', action_name,
      'hours_logged', 0,
      'check_in_at', active_session.check_in_at
    );
  end if;

  if active_session.event_id <> p_event_id then
    raise exception 'volunteer is already checked in for another event' using errcode = '22023';
  end if;

  completed_session := active_session;
  completed_session.check_out_at := greatest(
    clock_timestamp(),
    completed_session.check_in_at + interval '1 microsecond'
  );
  elapsed_hours := round(
    extract(epoch from (completed_session.check_out_at - completed_session.check_in_at)) / 3600,
    2
  );
  completed_session.hours_logged := greatest(elapsed_hours, 0);

  update public.attendance_sessions
  set check_out_at = completed_session.check_out_at,
      hours_logged = completed_session.hours_logged
  where id = active_session.id
  returning * into completed_session;

  update public.volunteer_registrations
  set status = 'attended',
      hours = completed_session.hours_logged,
      checked_in_at = completed_session.check_in_at
  where id = registration.id
  returning * into registration;

  update public.profiles
  set total_hours = total_hours + completed_session.hours_logged
  where id = volunteer.id
  returning * into volunteer;

  if completed_session.hours_logged > 0 then
    insert into public.volunteer_hour_adjustments (
      user_id, adjusted_by, hours_delta, reason, attendance_session_id
    )
    values (
      volunteer.id, auth.uid(), completed_session.hours_logged,
      'Attendance session completed', completed_session.id
    );
  end if;

  action_name := 'checkedOut';
  return jsonb_build_object(
    'profile', to_jsonb(volunteer),
    'registration', to_jsonb(registration),
    'action', action_name,
    'hours_logged', completed_session.hours_logged,
    'check_in_at', completed_session.check_in_at,
    'check_out_at', completed_session.check_out_at
  );
end;
$$;

create or replace function public.staff_adjust_volunteer_hours(
  p_user_id uuid,
  p_hours numeric,
  p_reason text default ''
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_row public.profiles;
begin
  if not public.is_staff() then
    raise exception 'staff authorization required' using errcode = '42501';
  end if;
  if p_user_id is null or p_hours is null or p_hours::text = 'NaN'
     or p_hours = 0 or abs(p_hours) > 1000 then
    raise exception 'hour adjustment is invalid' using errcode = '22023';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 3 or length(p_reason) > 500 then
    raise exception 'a meaningful adjustment reason is required' using errcode = '22023';
  end if;

  select * into profile_row
  from public.profiles
  where id = p_user_id
  for update;
  if not found then
    raise exception 'volunteer profile not found' using errcode = '22023';
  end if;
  if profile_row.total_hours + p_hours < 0 then
    raise exception 'hour adjustment would make total hours negative' using errcode = '22023';
  end if;

  update public.profiles
  set total_hours = total_hours + p_hours
  where id = p_user_id
  returning * into profile_row;

  insert into public.volunteer_hour_adjustments (user_id, adjusted_by, hours_delta, reason)
  values (p_user_id, auth.uid(), p_hours, btrim(p_reason));
  return profile_row;
end;
$$;

revoke all on function public.cancel_event_registration(text) from public;
revoke all on function public.register_for_event(text) from public;
revoke all on function public.staff_check_in_or_out(text, text) from public;
revoke all on function public.staff_adjust_volunteer_hours(uuid, numeric, text) from public;
grant execute on function public.cancel_event_registration(text) to authenticated;
grant execute on function public.register_for_event(text) to authenticated;
grant execute on function public.staff_check_in_or_out(text, text) to authenticated;
grant execute on function public.staff_adjust_volunteer_hours(uuid, numeric, text) to authenticated;
