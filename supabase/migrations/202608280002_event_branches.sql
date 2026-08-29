-- Task 6 authoritative event branches.
-- Existing rows remain California unless an owner explicitly writes `ga`.

alter table public.events
  add column if not exists branch text;

update public.events
set branch = 'ca'
where branch is null or trim(branch) = '' or branch not in ('ca', 'ga');

alter table public.events
  alter column branch set default 'ca',
  alter column branch set not null;

alter table public.events
  drop constraint if exists events_branch_check;
alter table public.events
  add constraint events_branch_check check (branch in ('ca', 'ga'));

create index if not exists events_branch_status_start_idx
  on public.events (branch, status, starts_at);

-- Public column privileges stay narrow while adding only the authoritative
-- branch field. Service-role CRUD remains table-scoped for the trusted server
-- repository, and existing registration policies/grants are unchanged.
-- The public repository filters on publication_state explicitly before
-- projecting the row. These are the only two newly exposed columns; RLS still
-- admits only published event rows and the application strips publication_state
-- before returning the public JSON shape.
grant select (branch, publication_state) on public.events to anon, authenticated;
