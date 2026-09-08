-- Service-role PostgREST privilege boundary tests.
begin;
select plan(34);

-- The server-side content repository uses these operations directly through
-- PostgREST. Participant inserts remain inside the security-definer RPC.
select ok(has_table_privilege('service_role', 'public.events', 'SELECT'), 'service_role can read events');
select ok(has_table_privilege('service_role', 'public.events', 'INSERT'), 'service_role can create events');
select ok(has_table_privilege('service_role', 'public.events', 'UPDATE'), 'service_role can update events');
select ok(has_table_privilege('service_role', 'public.events', 'DELETE'), 'service_role can delete events');

select ok(has_table_privilege('service_role', 'public.registration_forms', 'SELECT'), 'service_role can read registration forms');
select ok(has_table_privilege('service_role', 'public.registration_forms', 'INSERT'), 'service_role can create registration forms');
select ok(has_table_privilege('service_role', 'public.registration_forms', 'UPDATE'), 'service_role can update registration forms');

select ok(has_table_privilege('service_role', 'public.impact_metrics', 'SELECT'), 'service_role can read impact metrics');
select ok(has_table_privilege('service_role', 'public.impact_metrics', 'INSERT'), 'service_role can create impact metrics');
select ok(has_table_privilege('service_role', 'public.impact_metrics', 'UPDATE'), 'service_role can update impact metrics');
select ok(has_table_privilege('service_role', 'public.impact_metrics', 'DELETE'), 'service_role can delete impact metrics');

select ok(has_table_privilege('service_role', 'public.site_content', 'SELECT'), 'service_role can read site content');
select ok(has_table_privilege('service_role', 'public.site_content', 'INSERT'), 'service_role can create site content');
select ok(has_table_privilege('service_role', 'public.site_content', 'UPDATE'), 'service_role can update site content');

select ok(has_table_privilege('service_role', 'public.contact_submissions', 'INSERT'), 'service_role can accept contact submissions');
select ok(has_table_privilege('service_role', 'public.participant_registrations', 'SELECT'), 'service_role can read participant registrations for staff exports');
select ok(has_table_privilege('service_role', 'public.media_assets', 'SELECT'), 'service_role can read media metadata');
select ok(has_table_privilege('service_role', 'public.media_assets', 'INSERT'), 'service_role can create pending media metadata');
select ok(has_table_privilege('service_role', 'public.media_assets', 'UPDATE'), 'service_role can finalize media metadata');

-- The service role must not become a second path around owner-controlled
-- staff membership, profile identity, volunteer registration, attendance, or
-- database-owned hour adjustments.
select ok(not has_table_privilege('service_role', 'public.staff_members', 'INSERT'), 'service_role cannot insert staff membership');
select ok(not has_table_privilege('service_role', 'public.staff_members', 'UPDATE'), 'service_role cannot update staff membership');
select ok(not has_table_privilege('service_role', 'public.staff_members', 'DELETE'), 'service_role cannot delete staff membership');

select ok(not has_table_privilege('service_role', 'public.profiles', 'INSERT'), 'service_role cannot insert profiles');
select ok(not has_table_privilege('service_role', 'public.profiles', 'UPDATE'), 'service_role cannot update profiles');
select ok(not has_table_privilege('service_role', 'public.profiles', 'DELETE'), 'service_role cannot delete profiles');

select ok(not has_table_privilege('service_role', 'public.volunteer_registrations', 'INSERT'), 'service_role cannot insert volunteer registrations');
select ok(not has_table_privilege('service_role', 'public.volunteer_registrations', 'UPDATE'), 'service_role cannot update volunteer registrations');
select ok(not has_table_privilege('service_role', 'public.volunteer_registrations', 'DELETE'), 'service_role cannot delete volunteer registrations');

select ok(not has_table_privilege('service_role', 'public.attendance_sessions', 'INSERT'), 'service_role cannot insert attendance sessions');
select ok(not has_table_privilege('service_role', 'public.attendance_sessions', 'UPDATE'), 'service_role cannot update attendance sessions');
select ok(not has_table_privilege('service_role', 'public.attendance_sessions', 'DELETE'), 'service_role cannot delete attendance sessions');

select ok(not has_table_privilege('service_role', 'public.volunteer_hour_adjustments', 'INSERT'), 'service_role cannot insert hour adjustments');
select ok(not has_table_privilege('service_role', 'public.volunteer_hour_adjustments', 'UPDATE'), 'service_role cannot update hour adjustments');
select ok(not has_table_privilege('service_role', 'public.volunteer_hour_adjustments', 'DELETE'), 'service_role cannot delete hour adjustments');

select * from finish();
rollback;
