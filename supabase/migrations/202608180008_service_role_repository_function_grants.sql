-- Trusted repository trigger and check-function grants.
--
-- Migration 007 grants service_role table access for PostgREST repositories,
-- but PostgreSQL also checks EXECUTE on functions used by table constraints
-- and triggers. Keep these grants limited to the service role: browser roles
-- must not be able to call the validation or audit helpers directly.

grant execute on function public.valid_form_fields(jsonb) to service_role;
grant execute on function public.preserve_content_created_by() to service_role;
grant execute on function public.touch_updated_at() to service_role;
