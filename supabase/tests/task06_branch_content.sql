-- Task 06 branch/event and typed branch-document contract tests.
-- Run against a fresh local database after all checked-in migrations.

begin;
select plan(18);

select has_table('public', 'branch_documents', 'typed branch document table exists');
select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events'
      and column_name = 'branch' and is_nullable = 'NO'
  ),
  'events branch is required'
);
select is(
  (select column_default from information_schema.columns
   where table_schema = 'public' and table_name = 'events' and column_name = 'branch'),
  '''ca''::text',
  'events default branch is California'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.events'::regclass
      and conname = 'events_branch_check'
      and pg_get_constraintdef(oid) ilike '%ca%ga%'
  ),
  'events branch check allows only ca and ga'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'events_branch_status_start_idx'
  ),
  'events branch/status/start index exists'
);
select ok(has_column_privilege('anon', 'public.events', 'branch', 'SELECT'), 'public events expose branch only as a read column');

insert into public.events (id, slug, title, status, publication_state)
values ('task06-default-event', 'task06-default-event', 'Task 06 default event', 'upcoming', 'unpublished')
on conflict (id) do nothing;
select is(
  (select branch from public.events where id = 'task06-default-event'),
  'ca',
  'new events default to California'
);

select ok((select relrowsecurity from pg_class where oid = 'public.branch_documents'::regclass), 'branch documents enable RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'public.branch_documents'::regclass), 'branch documents force RLS');
select is((select count(*) from public.branch_documents), 2::bigint, 'CA and GA drafts are seeded without content');
select is((select count(*) from public.branch_documents where key in ('branch:ca', 'branch:ga') and branch in ('ca', 'ga')), 2::bigint, 'seed keys and codes use the exact branch enum');
select is((select count(*) from public.branch_documents where publication_state = 'unpublished' and not safe_for_public and approval_status = 'pending'), 2::bigint, 'seed packets are private unpublished drafts');
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.branch_documents'::regclass
      and conname = 'branch_documents_key_matches_branch'
  ),
  'branch document key must match its branch code'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.branch_documents'::regclass
      and conname = 'branch_documents_approval_evidence'
  ),
  'published branch documents require approval evidence'
);
select ok(not has_table_privilege('anon', 'public.branch_documents', 'SELECT'), 'anonymous clients have no whole-table branch privilege');
select ok(not has_column_privilege('anon', 'public.branch_documents', 'approved_by', 'SELECT'), 'public branch projection excludes approval actor');
select ok(has_table_privilege('service_role', 'public.branch_documents', 'INSERT'), 'service role can save typed branch drafts');
select ok(has_table_privilege('service_role', 'public.branch_documents', 'UPDATE'), 'service role can update typed branch drafts');

select * from finish();
rollback;
