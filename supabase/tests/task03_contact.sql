-- pgTAP coverage for Task 03 contact inbox and durable abuse controls.
-- Run with `supabase db reset` followed by `supabase test db`.

begin;
select plan(29);

select has_table('public', 'contact_submissions', 'contact submissions remain available');
select has_table('public', 'chat_rate_limit_buckets', 'shared rate-limit buckets exist');
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'contact_submissions_created_at_id_idx'
  ),
  'contact list has a created/id keyset index'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'contact_submissions_status_created_at_id_idx'
  ),
  'contact status filtering has a composite index'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'chat_rate_limit_buckets_expires_at_idx'
  ),
  'expired rate-limit rows have a prune index'
);
select has_function(
  'public', 'consume_chat_rate_limit',
  array['text', 'integer', 'integer', 'timestamptz'],
  'timestamped shared atomic rate-limit RPC exists with its exact signature'
);
select has_function(
  'public', 'consume_chat_rate_limit',
  array['text', 'integer', 'integer'],
  'PostgREST shared atomic rate-limit RPC exists with its exact signature'
);
select ok(
  (select proargdefaults is null
   from pg_proc
   where pronamespace = 'public'::regnamespace
     and proname = 'consume_chat_rate_limit'
     and proargtypes::oid[] = array[
       'text'::regtype, 'integer'::regtype, 'integer'::regtype, 'timestamptz'::regtype
     ]),
  'timestamped rate-limit RPC has no defaulted argument that could make calls ambiguous'
);
select ok((select relforcerowsecurity from pg_class where oid = 'public.contact_submissions'::regclass), 'contact submissions force RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'public.chat_rate_limit_buckets'::regclass), 'rate-limit buckets force RLS');
select ok(not has_table_privilege('anon', 'public.chat_rate_limit_buckets', 'SELECT'), 'anon cannot read rate-limit buckets');
select ok(not has_table_privilege('authenticated', 'public.chat_rate_limit_buckets', 'SELECT'), 'authenticated cannot read rate-limit buckets');
select ok(not has_column_privilege('anon', 'public.contact_submissions', 'message', 'SELECT'), 'anon cannot read contact messages');
select ok(has_table_privilege('service_role', 'public.contact_submissions', 'INSERT'), 'service role can insert contact submissions');
select ok(has_table_privilege('service_role', 'public.contact_submissions', 'SELECT'), 'service role can read protected contact submissions');
select ok(has_column_privilege('service_role', 'public.contact_submissions', 'status', 'UPDATE'), 'service role can update only contact status');
select ok(not has_column_privilege('authenticated', 'public.contact_submissions', 'status', 'UPDATE'), 'authenticated clients cannot directly update contact status');
select ok(has_function_privilege('service_role', 'public.consume_chat_rate_limit(text,integer,integer,timestamptz)', 'EXECUTE'), 'service role can consume rate-limit buckets');
select ok(has_function_privilege('service_role', 'public.consume_chat_rate_limit(text,integer,integer)', 'EXECUTE'), 'service role can consume the PostgREST rate-limit overload');
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contact_submissions' and policyname = 'contact_submissions_staff_read'
  ),
  'staff read policy remains explicit'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contact_submissions' and policyname = 'contact_submissions_staff_update'
  ),
  'staff update policy is explicit'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.contact_submissions'::regclass
      and conname = 'contact_submissions_status_check'
  ),
  'contact status has the exact bounded values constraint'
);

select is(
  public.consume_chat_rate_limit('contact:' || repeat('a', 64), 2, 2, '2026-08-26T12:00:00Z'::timestamptz),
  true,
  'first request opens a bucket'
);
select is(
  public.consume_chat_rate_limit('contact:' || repeat('a', 64), 2, 2, '2026-08-26T12:00:00Z'::timestamptz),
  true,
  'second request remains within the bucket'
);
select is(
  public.consume_chat_rate_limit('contact:' || repeat('a', 64), 2, 2, '2026-08-26T12:00:00Z'::timestamptz),
  false,
  'request over the limit is denied atomically'
);
select is(
  public.consume_chat_rate_limit('contact:' || repeat('a', 64), 2, 2, '2026-08-26T12:00:03Z'::timestamptz),
  true,
  'expired bucket resets without a second identity row'
);
select throws_ok(
  $$select public.consume_chat_rate_limit('203.0.113.10', 600, 5, now())$$,
  '22023',
  'invalid rate limit request',
  'raw or malformed identities cannot become bucket keys'
);
select ok(
  not exists (
    select 1 from public.chat_rate_limit_buckets where bucket_key like '%203.0.113.10%'
  ),
  'rate-limit storage contains no raw identity fixture'
);

select is(
  public.consume_chat_rate_limit('contact:' || repeat('b', 64), 600, 5),
  true,
  'three-argument rate-limit execution resolves unambiguously'
);

select * from finish();
rollback;
