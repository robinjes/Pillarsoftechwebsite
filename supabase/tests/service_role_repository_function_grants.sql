-- Service-role EXECUTE privileges required by migration-007 table writes.
begin;
select plan(9);

select has_function(
  'public', 'valid_form_fields', array['jsonb'],
  'registration form validation function exists'
);
select ok(
  has_function_privilege('service_role', 'public.valid_form_fields(jsonb)', 'EXECUTE'),
  'service_role can execute registration form validation'
);
select ok(
  not has_function_privilege('anon', 'public.valid_form_fields(jsonb)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.valid_form_fields(jsonb)', 'EXECUTE'),
  'browser roles cannot execute registration form validation'
);

select has_function(
  'public', 'preserve_content_created_by', array[]::text[],
  'content ownership trigger function exists'
);
select ok(
  has_function_privilege('service_role', 'public.preserve_content_created_by()', 'EXECUTE'),
  'service_role can execute content ownership trigger'
);
select ok(
  not has_function_privilege('anon', 'public.preserve_content_created_by()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.preserve_content_created_by()', 'EXECUTE'),
  'browser roles cannot execute content ownership trigger'
);

select has_function(
  'public', 'touch_updated_at', array[]::text[],
  'timestamp trigger function exists'
);
select ok(
  has_function_privilege('service_role', 'public.touch_updated_at()', 'EXECUTE'),
  'service_role can execute timestamp trigger'
);
select ok(
  not has_function_privilege('anon', 'public.touch_updated_at()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.touch_updated_at()', 'EXECUTE'),
  'browser roles cannot execute timestamp trigger'
);

select * from finish();
rollback;
