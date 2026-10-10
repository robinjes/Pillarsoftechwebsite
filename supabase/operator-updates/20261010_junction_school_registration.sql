-- Content correction for an existing Junction event. No publication or
-- volunteer registration changes; preserve other resources and event fields.
begin;

update public.events
set resources = (coalesce(resources, '{}'::jsonb) - 'registrationLink') || jsonb_build_object(
      'registrationNote', 'Registration is for Junction students only. The registration link will be shared through the school.'
    ),
    participant_registration_state = 'closed'
where id = 'stem-into-the-night-2026';

commit;
