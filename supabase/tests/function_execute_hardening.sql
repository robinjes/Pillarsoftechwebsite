-- These assertions run after the forward ACL migration. The operator's
-- rollback-only regression fixture broadens the target ACLs, applies that
-- migration, and then runs this suite before rolling the fixture back.
begin;
set local search_path = public, extensions;
select plan(21);

select has_function('public', 'touch_updated_at', array[]::text[], 'timestamp trigger function exists');
select has_function('public', 'valid_form_fields', array['jsonb'], 'registration form validation function exists');
select has_function('public', 'handle_new_user', array[]::text[], 'auth profile trigger function exists');
select has_function('public', 'preserve_content_created_by', array[]::text[], 'content ownership trigger function exists');
select has_function('public', 'register_participant', array['text', 'jsonb'], 'server registration function exists');
select has_function('public', 'is_staff', array[]::text[], 'staff check function exists');
select has_function('public', 'register_for_event', array['text'], 'volunteer registration RPC exists');
select has_function('public', 'cancel_event_registration', array['text'], 'volunteer cancellation RPC exists');
select has_function('public', 'staff_check_in_or_out', array['text', 'text'], 'staff attendance RPC exists');
select has_function('public', 'staff_adjust_volunteer_hours', array['uuid', 'numeric', 'text'], 'staff hour adjustment RPC exists');

select ok(
  has_function_privilege('service_role', 'public.touch_updated_at()', 'EXECUTE')
    and not has_function_privilege('anon', 'public.touch_updated_at()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.touch_updated_at()', 'EXECUTE'),
  'timestamp trigger is executable only by the server role'
);
select ok(
  has_function_privilege('service_role', 'public.valid_form_fields(jsonb)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.valid_form_fields(jsonb)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.valid_form_fields(jsonb)', 'EXECUTE'),
  'form validation is executable only by the server role'
);
select ok(
  not has_function_privilege('service_role', 'public.handle_new_user()', 'EXECUTE')
    and not has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE'),
  'auth profile trigger is not directly callable by API roles'
);
select ok(
  has_function_privilege('service_role', 'public.preserve_content_created_by()', 'EXECUTE')
    and not has_function_privilege('anon', 'public.preserve_content_created_by()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.preserve_content_created_by()', 'EXECUTE'),
  'content ownership trigger is executable only by the server role'
);
select ok(
  has_function_privilege('service_role', 'public.register_participant(text, jsonb)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.register_participant(text, jsonb)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.register_participant(text, jsonb)', 'EXECUTE'),
  'legacy server registration function remains server-only'
);
select ok(
  has_function_privilege('authenticated', 'public.is_staff()', 'EXECUTE')
    and not has_function_privilege('anon', 'public.is_staff()', 'EXECUTE')
    and not has_function_privilege('service_role', 'public.is_staff()', 'EXECUTE'),
  'staff status RPC is available only to authenticated callers'
);
select ok(
  has_function_privilege('authenticated', 'public.register_for_event(text)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.register_for_event(text)', 'EXECUTE')
    and not has_function_privilege('service_role', 'public.register_for_event(text)', 'EXECUTE'),
  'self-service registration RPC remains authenticated-only'
);
select ok(
  has_function_privilege('authenticated', 'public.cancel_event_registration(text)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.cancel_event_registration(text)', 'EXECUTE')
    and not has_function_privilege('service_role', 'public.cancel_event_registration(text)', 'EXECUTE'),
  'self-service cancellation RPC remains authenticated-only'
);
select ok(
  has_function_privilege('authenticated', 'public.staff_check_in_or_out(text, text)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.staff_check_in_or_out(text, text)', 'EXECUTE')
    and not has_function_privilege('service_role', 'public.staff_check_in_or_out(text, text)', 'EXECUTE'),
  'staff attendance RPC remains authenticated-only and checks membership internally'
);
select ok(
  has_function_privilege('authenticated', 'public.staff_adjust_volunteer_hours(uuid, numeric, text)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.staff_adjust_volunteer_hours(uuid, numeric, text)', 'EXECUTE')
    and not has_function_privilege('service_role', 'public.staff_adjust_volunteer_hours(uuid, numeric, text)', 'EXECUTE'),
  'staff adjustment RPC remains authenticated-only and checks membership internally'
);

select ok(
  has_function_privilege('service_role', 'public.consume_chat_rate_limit(text, integer, integer)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.consume_chat_rate_limit(text, integer, integer)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.consume_chat_rate_limit(text, integer, integer)', 'EXECUTE'),
  'unrelated rate-limit function retains its existing server-only grant'
);

select * from finish();
rollback;
