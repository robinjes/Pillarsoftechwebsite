-- Compose the public form policy with the events RLS policy.
--
-- Anonymous clients do not have SELECT on events.publication_state. The
-- events_public_read policy already admits only published events, so the
-- correlated EXISTS must reference only the publicly granted event id and let
-- events RLS decide whether that row is visible.

drop policy if exists registration_forms_public_read on public.registration_forms;

create policy registration_forms_public_read on public.registration_forms
for select to anon, authenticated using (
  is_active and exists (
    select 1
    from public.events
    where events.id = registration_forms.event_id
  )
);
