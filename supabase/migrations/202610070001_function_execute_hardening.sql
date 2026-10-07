-- Normalize only application function grants that earlier migrations
-- restricted from PUBLIC without clearing explicit API-role grants retained
-- by an upgraded production database. Unrelated legacy functions and default
-- privileges are intentionally outside this allowlist.

-- Repository trigger/check helpers are server-only. The auth profile trigger
-- needs no direct API-role execution grant; its existing trigger stays intact.
revoke all on function public.touch_updated_at()
  from public, anon, authenticated, service_role;
grant execute on function public.touch_updated_at() to service_role;

revoke all on function public.valid_form_fields(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.valid_form_fields(jsonb) to service_role;

revoke all on function public.handle_new_user()
  from public, anon, authenticated, service_role;

revoke all on function public.preserve_content_created_by()
  from public, anon, authenticated, service_role;
grant execute on function public.preserve_content_created_by() to service_role;

revoke all on function public.register_participant(text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.register_participant(text, jsonb) to service_role;

-- Authenticated users may use self-service registration and staff RPCs; the
-- RPCs enforce ownership or staff membership internally.
revoke all on function public.is_staff()
  from public, anon, authenticated, service_role;
grant execute on function public.is_staff() to authenticated;

revoke all on function public.register_for_event(text)
  from public, anon, authenticated, service_role;
grant execute on function public.register_for_event(text) to authenticated;

revoke all on function public.cancel_event_registration(text)
  from public, anon, authenticated, service_role;
grant execute on function public.cancel_event_registration(text) to authenticated;

revoke all on function public.staff_check_in_or_out(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.staff_check_in_or_out(text, text) to authenticated;

revoke all on function public.staff_adjust_volunteer_hours(uuid, numeric, text)
  from public, anon, authenticated, service_role;
grant execute on function public.staff_adjust_volunteer_hours(uuid, numeric, text) to authenticated;
