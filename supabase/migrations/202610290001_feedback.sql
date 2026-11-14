-- Event feedback forms with host-editable questions.
--
-- The audience form is an unlisted route reached by QR code. As with the
-- live Q&A, browser roles receive no direct privileges: the public form and
-- its submissions go through validated, rate-limited server routes using the
-- service role, and form editing and results go through staff-only routes.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Forms
-- ---------------------------------------------------------------------------

create table if not exists public.feedback_forms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  intro text not null default '',
  collect_contact boolean not null default true,
  is_current boolean not null default false,
  accepting_responses boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint feedback_forms_title_length
    check (char_length(trim(title)) between 1 and 120),
  constraint feedback_forms_intro_length
    check (char_length(intro) <= 600)
);

-- At most one form is shown at /feedback at a time.
create unique index if not exists feedback_forms_single_current_key
  on public.feedback_forms (is_current)
  where is_current;
create index if not exists feedback_forms_created_at_idx
  on public.feedback_forms (created_at desc);

drop trigger if exists feedback_forms_touch_updated_at on public.feedback_forms;
create trigger feedback_forms_touch_updated_at
before update on public.feedback_forms
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Questions
-- ---------------------------------------------------------------------------

create table if not exists public.feedback_questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.feedback_forms(id) on delete cascade,
  position integer not null,
  kind text not null,
  prompt text not null,
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint feedback_questions_position_nonnegative
    check (position >= 0),
  constraint feedback_questions_kind_check
    check (kind in ('rating', 'single_choice', 'multi_choice', 'short_text', 'long_text')),
  constraint feedback_questions_prompt_length
    check (char_length(trim(prompt)) between 1 and 300),
  constraint feedback_questions_options_array
    check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) <= 20),
  constraint feedback_questions_choice_options
    check (kind not in ('single_choice', 'multi_choice') or jsonb_array_length(options) >= 2)
);

create index if not exists feedback_questions_form_position_idx
  on public.feedback_questions (form_id, position);

drop trigger if exists feedback_questions_touch_updated_at on public.feedback_questions;
create trigger feedback_questions_touch_updated_at
before update on public.feedback_questions
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Responses
-- ---------------------------------------------------------------------------

create table if not exists public.feedback_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.feedback_forms(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  respondent_name text,
  respondent_email text,
  visitor_token_digest text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint feedback_responses_answers_object
    check (jsonb_typeof(answers) = 'object' and octet_length(answers::text) <= 40000),
  constraint feedback_responses_name_length
    check (respondent_name is null or char_length(trim(respondent_name)) between 1 and 80),
  constraint feedback_responses_email_length
    check (respondent_email is null or char_length(respondent_email) between 3 and 254),
  constraint feedback_responses_token_digest_format
    check (visitor_token_digest ~ '^[0-9a-f]{64}$')
);

-- One response per device per form keeps results honest without sign-in.
create unique index if not exists feedback_responses_one_per_device_key
  on public.feedback_responses (form_id, visitor_token_digest);
create index if not exists feedback_responses_form_created_at_idx
  on public.feedback_responses (form_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- Switch the current form atomically so the single-current index never sees
-- two rows. Passing null clears the current form.
create or replace function public.feedback_set_current_form(p_form_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.feedback_forms set is_current = false where is_current and id is distinct from p_form_id;
  if p_form_id is not null then
    update public.feedback_forms set is_current = true where id = p_form_id;
    if not found then
      raise exception 'form unavailable' using errcode = 'P0002';
    end if;
  end if;
end;
$$;

-- Replace a form's question list in one transaction: questions with an id
-- are updated in place (so existing answers stay attached), new ones are
-- inserted, and any question left out is removed. Order follows the array.
create or replace function public.feedback_replace_questions(p_form_id uuid, p_questions jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  item_id uuid;
  next_position integer := 0;
begin
  if p_form_id is null
     or p_questions is null
     or jsonb_typeof(p_questions) <> 'array'
     or jsonb_array_length(p_questions) > 30 then
    raise exception 'invalid question list' using errcode = '22023';
  end if;

  perform 1 from public.feedback_forms where id = p_form_id for update;
  if not found then
    raise exception 'form unavailable' using errcode = 'P0002';
  end if;

  delete from public.feedback_questions
  where form_id = p_form_id
    and id not in (
      select (element->>'id')::uuid
      from jsonb_array_elements(p_questions) as element
      where nullif(element->>'id', '') is not null
    );

  for item in select value from jsonb_array_elements(p_questions) loop
    item_id := nullif(item->>'id', '')::uuid;
    if item_id is not null then
      update public.feedback_questions
      set position = next_position,
          kind = item->>'kind',
          prompt = item->>'prompt',
          required = coalesce((item->>'required')::boolean, false),
          options = coalesce(item->'options', '[]'::jsonb)
      where id = item_id and form_id = p_form_id;
      if not found then
        raise exception 'question unavailable' using errcode = 'P0002';
      end if;
    else
      insert into public.feedback_questions (form_id, position, kind, prompt, required, options)
      values (
        p_form_id,
        next_position,
        item->>'kind',
        item->>'prompt',
        coalesce((item->>'required')::boolean, false),
        coalesce(item->'options', '[]'::jsonb)
      );
    end if;
    next_position := next_position + 1;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

alter table public.feedback_forms enable row level security;
alter table public.feedback_forms force row level security;
alter table public.feedback_questions enable row level security;
alter table public.feedback_questions force row level security;
alter table public.feedback_responses enable row level security;
alter table public.feedback_responses force row level security;

revoke all on table public.feedback_forms from public, anon, authenticated;
revoke all on table public.feedback_questions from public, anon, authenticated;
revoke all on table public.feedback_responses from public, anon, authenticated;

grant select, insert, update, delete on table public.feedback_forms to service_role;
grant select, insert, update, delete on table public.feedback_questions to service_role;
grant select, insert on table public.feedback_responses to service_role;

revoke all on function public.feedback_set_current_form(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.feedback_set_current_form(uuid) to service_role;

revoke all on function public.feedback_replace_questions(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.feedback_replace_questions(uuid, jsonb) to service_role;
