-- Task 04A chat storage foundation.
--
-- Visitor chat is private data. Browser roles receive no direct privileges;
-- server routes use the service role only after validating ownership and
-- request authorization. Discord delivery fields are storage-only here so
-- the follow-on bridge can preserve failed work without changing the schema.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------------

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_token_digest text not null,
  display_name text not null,
  email text not null default '',
  is_under_13 boolean not null default false,
  guardian_attested boolean not null default false,
  status text not null default 'open',
  ownership_expires_at timestamptz not null,
  terminal_at timestamptz,
  discord_thread_id text,
  discord_delivery_status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chat_conversations_token_digest_format
    check (visitor_token_digest ~ '^[0-9a-f]{64}$'),
  constraint chat_conversations_display_name_length
    check (char_length(trim(display_name)) between 1 and 160),
  constraint chat_conversations_email_length
    check (char_length(email) <= 320),
  constraint chat_conversations_status_check
    check (status in ('open', 'closed', 'spam')),
  constraint chat_conversations_guardian_check
    check (not is_under_13 or guardian_attested),
  constraint chat_conversations_ownership_after_create
    check (ownership_expires_at > created_at),
  constraint chat_conversations_terminal_state_check
    check ((status = 'open' and terminal_at is null) or (status in ('closed', 'spam') and terminal_at is not null)),
  constraint chat_conversations_thread_id_format
    check (discord_thread_id is null or discord_thread_id ~ '^[0-9]{1,30}$'),
  constraint chat_conversations_delivery_status_check
    check (discord_delivery_status in ('pending', 'sent', 'failed'))
);

create unique index if not exists chat_conversations_token_digest_key
  on public.chat_conversations (visitor_token_digest);
create index if not exists chat_conversations_owner_status_idx
  on public.chat_conversations (visitor_token_digest, status, ownership_expires_at);
create index if not exists chat_conversations_active_created_at_id_idx
  on public.chat_conversations (created_at asc, id asc)
  where status = 'open';
create index if not exists chat_conversations_terminal_retention_idx
  on public.chat_conversations (terminal_at asc, id asc)
  where status in ('closed', 'spam');

drop trigger if exists chat_conversations_touch_updated_at on public.chat_conversations;
create trigger chat_conversations_touch_updated_at
before update on public.chat_conversations
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender text not null,
  body text not null,
  delivery_status text not null default 'pending',
  delivery_attempts integer not null default 0,
  delivery_error text,
  discord_message_id text,
  source_interaction_id text,
  last_delivery_attempt_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chat_messages_sender_check
    check (sender in ('visitor', 'staff', 'system')),
  constraint chat_messages_body_length
    check (char_length(trim(body)) between 1 and 4000),
  constraint chat_messages_plain_text_check
    check (position('<' in body) = 0 and position('>' in body) = 0),
  constraint chat_messages_delivery_status_check
    check (delivery_status in ('pending', 'sent', 'failed')),
  constraint chat_messages_delivery_attempts_bounded
    check (delivery_attempts between 0 and 20),
  constraint chat_messages_delivery_error_length
    check (delivery_error is null or char_length(delivery_error) <= 240),
  constraint chat_messages_discord_message_id_format
    check (discord_message_id is null or discord_message_id ~ '^[0-9]{1,30}$'),
  constraint chat_messages_interaction_id_format
    check (source_interaction_id is null or source_interaction_id ~ '^[0-9]{1,30}$')
);

create unique index if not exists chat_messages_source_interaction_key
  on public.chat_messages (source_interaction_id)
  where source_interaction_id is not null;
create index if not exists chat_messages_conversation_created_at_id_idx
  on public.chat_messages (conversation_id, created_at asc, id asc);
create index if not exists chat_messages_failed_retry_idx
  on public.chat_messages (last_delivery_attempt_at asc, created_at asc, id asc)
  where delivery_status = 'failed';
create index if not exists chat_messages_pending_delivery_idx
  on public.chat_messages (created_at asc, id asc)
  where delivery_status = 'pending';

drop trigger if exists chat_messages_touch_updated_at on public.chat_messages;
create trigger chat_messages_touch_updated_at
before update on public.chat_messages
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Office-hour schedule and explicit queue gate
-- ---------------------------------------------------------------------------

create table if not exists public.chat_office_hours (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null,
  open_time text not null,
  close_time text not null,
  timezone text not null default 'America/Los_Angeles',
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chat_office_hours_weekday_check check (weekday between 1 and 7),
  constraint chat_office_hours_open_time_check check (open_time ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint chat_office_hours_close_time_check check (close_time ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint chat_office_hours_time_order check (open_time < close_time),
  constraint chat_office_hours_timezone_check check (timezone = 'America/Los_Angeles'),
  constraint chat_office_hours_unique_weekday unique (weekday)
);

drop trigger if exists chat_office_hours_touch_updated_at on public.chat_office_hours;
create trigger chat_office_hours_touch_updated_at
before update on public.chat_office_hours
for each row execute function public.touch_updated_at();

create table if not exists public.chat_queue_state (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null default 'default',
  queue_open boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chat_queue_state_singleton_check check (singleton_key = 'default'),
  constraint chat_queue_state_singleton_key unique (singleton_key)
);

drop trigger if exists chat_queue_state_touch_updated_at on public.chat_queue_state;
create trigger chat_queue_state_touch_updated_at
before update on public.chat_queue_state
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Owner-managed Discord identity mapping (writes remain an owner operation)
-- ---------------------------------------------------------------------------

create table if not exists public.staff_discord_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.staff_members(user_id) on delete cascade,
  discord_user_id text not null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint staff_discord_identities_discord_user_id_format
    check (discord_user_id ~ '^[0-9]{1,30}$'),
  constraint staff_discord_identities_unique_discord_user unique (discord_user_id)
);

create index if not exists staff_discord_identities_user_id_idx
  on public.staff_discord_identities (user_id)
  where active = true;

drop trigger if exists staff_discord_identities_touch_updated_at on public.staff_discord_identities;
create trigger staff_discord_identities_touch_updated_at
before update on public.staff_discord_identities
for each row execute function public.touch_updated_at();

-- Canonical schedule only. Updating existing rows makes this migration
-- repeatable; the queue singleton uses DO NOTHING so a deploy can never reopen
-- a queue that an owner has deliberately closed or toggled.
insert into public.chat_office_hours (id, weekday, open_time, close_time, timezone, enabled)
values
  ('10000000-0000-4000-8000-000000000001', 1, '16:00', '22:00', 'America/Los_Angeles', true),
  ('10000000-0000-4000-8000-000000000002', 2, '16:00', '22:00', 'America/Los_Angeles', true),
  ('10000000-0000-4000-8000-000000000003', 3, '16:00', '22:00', 'America/Los_Angeles', true),
  ('10000000-0000-4000-8000-000000000004', 4, '16:00', '22:00', 'America/Los_Angeles', true),
  ('10000000-0000-4000-8000-000000000005', 5, '16:00', '22:00', 'America/Los_Angeles', true)
on conflict (weekday) do update
set open_time = excluded.open_time,
    close_time = excluded.close_time,
    timezone = excluded.timezone,
    enabled = excluded.enabled;

insert into public.chat_queue_state (id, singleton_key, queue_open)
values ('20000000-0000-4000-8000-000000000001', 'default', false)
on conflict (singleton_key) do nothing;

-- ---------------------------------------------------------------------------
-- RLS and least-privilege server boundary
-- ---------------------------------------------------------------------------

alter table public.chat_conversations enable row level security;
alter table public.chat_conversations force row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_messages force row level security;
alter table public.chat_office_hours enable row level security;
alter table public.chat_office_hours force row level security;
alter table public.chat_queue_state enable row level security;
alter table public.chat_queue_state force row level security;
alter table public.staff_discord_identities enable row level security;
alter table public.staff_discord_identities force row level security;

revoke all on table public.chat_conversations from public, anon, authenticated;
revoke all on table public.chat_messages from public, anon, authenticated;
revoke all on table public.chat_office_hours from public, anon, authenticated;
revoke all on table public.chat_queue_state from public, anon, authenticated;
revoke all on table public.staff_discord_identities from public, anon, authenticated;

grant select, insert, update on table public.chat_conversations to service_role;
grant select, insert, update on table public.chat_messages to service_role;
grant select on table public.chat_office_hours to service_role;
grant select, update on table public.chat_queue_state to service_role;
grant select on table public.staff_discord_identities to service_role;

-- Keep this invariant explicit in the chat migration as well as the original
-- security foundation: service_role must not become a staff-membership writer.
revoke insert, update, delete on table public.staff_members from service_role;

revoke all on function public.touch_updated_at() from public, anon, authenticated;
grant execute on function public.touch_updated_at() to service_role;
