-- Task 2 cleanup reconciliation attempt-cap regressions.
-- Run after migration 202609050004_chat_cleanup_attempt_cap.sql on the
-- disposable Supabase database.  Fixtures are transaction-local.
begin;
select plan(9);

insert into public.chat_cleanup_jobs (
  id, conversation_id, guild_id, parent_channel_id, state, claim_token,
  lease_expires_at, attempt_count, failure_code, next_retry_at, created_at, updated_at
) values
  (
    '73000000-0000-4000-8000-000000000001',
    '73000000-0000-4000-8000-000000000101',
    '900000000000000001', '910000000000000001', 'pending', null, null, 0, null, null,
    now() - interval '10 minutes', now() - interval '10 minutes'
  ),
  (
    '73000000-0000-4000-8000-000000000002',
    '73000000-0000-4000-8000-000000000102',
    '900000000000000001', '910000000000000001', 'uncertain', null, null, 19, 'timeout', null,
    now() - interval '9 minutes', now() - interval '9 minutes'
  ),
  (
    '73000000-0000-4000-8000-000000000003',
    '73000000-0000-4000-8000-000000000103',
    '900000000000000001', '910000000000000001', 'claimed', '73000000-0000-4000-8000-000000000203',
    now() - interval '1 minute', 20, 'lease_expired', null,
    now() - interval '8 minutes', now() - interval '8 minutes'
  );

select is(
  (select attempt_count from public.claim_uncertain_chat_cleanup_job(
    '73000000-0000-4000-8000-000000000002',
    '73000000-0000-4000-8000-000000000202',
    60
  )),
  20,
  'uncertain cleanup reconciliation increments attempt count to the cap'
);
select is(
  (select state from public.finish_chat_cleanup_job(
    '73000000-0000-4000-8000-000000000002',
    '73000000-0000-4000-8000-000000000202',
    'uncertain', 'timeout', null
  )),
  'uncertain',
  'an uncertain external result preserves the exhausted body-free row'
);
select throws_ok(
  $$select public.claim_uncertain_chat_cleanup_job(
    '73000000-0000-4000-8000-000000000002',
    '73000000-0000-4000-8000-000000000204',
    60
  )$$,
  'P0010', 'cleanup attempts exhausted',
  'an exhausted uncertain cleanup cannot be claimed again'
);
select ok(
  not exists (
    select 1 from public.list_chat_cleanup_jobs(50)
    where id = '73000000-0000-4000-8000-000000000002'
  ),
  'an exhausted uncertain cleanup does not enter the bounded batch'
);
select is(
  (select id from public.list_chat_cleanup_jobs(1)),
  '73000000-0000-4000-8000-000000000001'::uuid,
  'the due cleanup remains first after exhausted reconciliation rows are filtered'
);
select ok(
  not exists (
    select 1 from public.list_chat_cleanup_jobs(50)
    where id = '73000000-0000-4000-8000-000000000003'
  ),
  'an exhausted expired claim does not enter the bounded batch'
);
select is(
  (select state from public.claim_chat_cleanup_job(
    '73000000-0000-4000-8000-000000000003',
    '73000000-0000-4000-8000-000000000205',
    60
  )),
  'uncertain',
  'an expired exhausted claim is normalized to uncertain for inspection'
);
select throws_ok(
  $$select public.claim_uncertain_chat_cleanup_job(
    '73000000-0000-4000-8000-000000000003',
    '73000000-0000-4000-8000-000000000206',
    60
  )$$,
  'P0010', 'cleanup attempts exhausted',
  'an expired exhausted claim cannot start another external deletion attempt'
);
select is(
  (select count(*) from public.chat_cleanup_jobs
   where id = '73000000-0000-4000-8000-000000000003'
     and state = 'uncertain'
     and attempt_count = 20),
  1::bigint,
  'the exhausted cleanup row remains body-free for owner inspection'
);

select * from finish();
rollback;
