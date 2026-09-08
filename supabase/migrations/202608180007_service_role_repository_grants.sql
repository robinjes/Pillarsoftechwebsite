-- Trusted server repository grants.
--
-- The service-role JWT bypasses RLS, but it still needs table privileges for
-- PostgREST requests. Keep this allowlist aligned with the server repositories
-- and leave volunteer/staff records behind their authenticated RLS/RPC path.

-- Content repository operations.
grant select, insert, update, delete on table public.events to service_role;
grant select, insert, update on table public.registration_forms to service_role;
grant select, insert, update, delete on table public.impact_metrics to service_role;
grant select, insert, update on table public.site_content to service_role;
grant insert on table public.contact_submissions to service_role;
grant select on table public.participant_registrations to service_role;

-- Media signing/finalization and delivery operations.
grant select, insert, update on table public.media_assets to service_role;

-- These records are owned by authenticated users and staff-only RPCs. The
-- trusted content/media repositories must not become an alternate mutation
-- path for identity, registration, attendance, or hour-audit state.
revoke all on table public.staff_members from service_role;
revoke all on table public.profiles from service_role;
revoke all on table public.volunteer_registrations from service_role;
revoke all on table public.attendance_sessions from service_role;
revoke all on table public.volunteer_hour_adjustments from service_role;
