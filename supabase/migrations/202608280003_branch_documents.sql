-- Task 6 typed CA/GA branch packets.
-- This is deliberately separate from the loose site_content table. Every
-- server repository read/write parses branch_documents through the strict
-- application contract before data can be rendered or persisted.

create table if not exists public.branch_documents (
  key text primary key,
  branch text not null,
  name text not null default '',
  service_area text not null default '',
  leaders jsonb not null default '[]'::jsonb,
  programs jsonb not null default '[]'::jsonb,
  contact_route jsonb not null default '{"label":"","url":""}'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  associated_event_ids jsonb not null default '[]'::jsonb,
  cta jsonb not null default '{"label":"","url":""}'::jsonb,
  publication_state text not null default 'unpublished',
  safe_for_public boolean not null default false,
  approval_status text not null default 'pending',
  approved_at timestamptz,
  -- A bounded owner-review marker is kept private; it may be an owner UUID or
  -- an out-of-band approval reference and is never part of public projection.
  approved_by text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint branch_documents_key_check check (key in ('branch:ca', 'branch:ga')),
  constraint branch_documents_code_check check (branch in ('ca', 'ga')),
  constraint branch_documents_key_matches_branch check (key = 'branch:' || branch),
  constraint branch_documents_publication_check check (publication_state in ('unpublished', 'published')),
  constraint branch_documents_approval_check check (approval_status in ('pending', 'approved', 'rejected')),
  constraint branch_documents_leaders_array check (jsonb_typeof(leaders) = 'array'),
  constraint branch_documents_programs_array check (jsonb_typeof(programs) = 'array'),
  constraint branch_documents_contact_route_object check (jsonb_typeof(contact_route) = 'object'),
  constraint branch_documents_photos_array check (jsonb_typeof(photos) = 'array'),
  constraint branch_documents_events_array check (jsonb_typeof(associated_event_ids) = 'array'),
  constraint branch_documents_cta_object check (jsonb_typeof(cta) = 'object'),
  constraint branch_documents_approval_evidence check (
    publication_state <> 'published'
    or (
      safe_for_public
      and approval_status = 'approved'
      and approved_at is not null
    )
  )
);

alter table public.branch_documents enable row level security;
alter table public.branch_documents force row level security;

drop trigger if exists branch_documents_touch_updated_at on public.branch_documents;
create trigger branch_documents_touch_updated_at
before update on public.branch_documents
for each row execute function public.touch_updated_at();

drop policy if exists branch_documents_public_read on public.branch_documents;
create policy branch_documents_public_read on public.branch_documents
for select to anon, authenticated using (
  publication_state = 'published'
  and safe_for_public
  and approval_status = 'approved'
  and approved_at is not null
);

drop policy if exists branch_documents_staff_read on public.branch_documents;
create policy branch_documents_staff_read on public.branch_documents
for select to authenticated using (public.is_staff());

revoke all on table public.branch_documents from anon, authenticated;
grant select (
  key, branch, name, service_area, leaders, programs, contact_route,
  photos, associated_event_ids, cta, publication_state, safe_for_public,
  approval_status, approved_at
) on public.branch_documents to anon, authenticated;

grant select, insert, update on table public.branch_documents to service_role;
grant execute on function public.touch_updated_at() to service_role;

-- These rows are intentionally empty drafts. They make the protected editor
-- predictable without inventing Georgia leaders, programs, service area,
-- photographs, or public claims.
insert into public.branch_documents (key, branch)
values ('branch:ca', 'ca'), ('branch:ga', 'ga')
on conflict (key) do nothing;
