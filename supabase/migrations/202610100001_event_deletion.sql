-- Removing an event must not erase attendance, registrations, or earned hours.
alter table public.events add column if not exists deleted_at timestamptz;

alter table public.events add constraint events_deleted_state_valid check (
  deleted_at is null or (
    publication_state = 'unpublished'
    and participant_registration_state = 'closed'
    and volunteer_registration_state = 'closed'
    and status = 'cancelled'
  )
);
