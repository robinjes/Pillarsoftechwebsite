-- =========================================================================
-- Pillars of Tech - Volunteer Portal Supabase SQL Schema
-- Copy and run this script in your Supabase SQL Editor (Dashboard > SQL Editor)
-- =========================================================================

-- 1. PROFILES TABLE
-- Stores profile information connected to Supabase Auth users.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null,
  member_code text unique not null,
  role text default 'volunteer' check (role in ('volunteer', 'staff')),
  total_hours numeric default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles
  add column if not exists total_hours numeric default 0 not null;

-- Helper used by RLS policies.
-- SECURITY DEFINER avoids recursive policies when checking whether the
-- current user is staff from inside policies on the profiles table itself.
create or replace function public.is_staff(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = $1 and role = 'staff'
  );
$$;

grant execute on function public.is_staff(uuid) to authenticated;

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies for profiles
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Staff can view all profiles" on public.profiles;
drop policy if exists "Staff can read all profiles" on public.profiles;
create policy "Staff can view all profiles" on public.profiles
  for select using (public.is_staff(auth.uid()));

drop policy if exists "Staff can update profiles" on public.profiles;
drop policy if exists "Staff can update all profiles" on public.profiles;
create policy "Staff can update profiles" on public.profiles
  for update using (public.is_staff(auth.uid()));


-- 2. EVENT VOLUNTEERS TABLE
-- Tracks registration status and assigned hours for each event.
create table if not exists public.event_volunteers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_id text not null,
  event_title text not null,
  status text default 'registered' check (status in ('registered', 'attended', 'absent')),
  hours numeric default 0 not null,
  checked_in_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, event_id)
);

-- Enable Row Level Security (RLS)
alter table public.event_volunteers enable row level security;

-- Policies for event_volunteers
drop policy if exists "Users can view their own signups" on public.event_volunteers;
drop policy if exists "Users can read own event signups" on public.event_volunteers;
create policy "Users can view their own signups" on public.event_volunteers
  for select using (auth.uid() = user_id);

drop policy if exists "Users can register themselves" on public.event_volunteers;
drop policy if exists "Users can create own event signups" on public.event_volunteers;
create policy "Users can register themselves" on public.event_volunteers
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own pending signups" on public.event_volunteers;
drop policy if exists "Users can delete own pending signups" on public.event_volunteers;
create policy "Users can delete their own pending signups" on public.event_volunteers
  for delete using (auth.uid() = user_id and status = 'registered');

drop policy if exists "Staff can view all signups" on public.event_volunteers;
drop policy if exists "Staff can read all event signups" on public.event_volunteers;
create policy "Staff can view all signups" on public.event_volunteers
  for select using (public.is_staff(auth.uid()));

drop policy if exists "Staff can update signups (for check-in)" on public.event_volunteers;
drop policy if exists "Staff can update event signups" on public.event_volunteers;
create policy "Staff can update signups (for check-in)" on public.event_volunteers
  for update using (public.is_staff(auth.uid()));

drop policy if exists "Staff can insert signups (for on-the-spot check-in)" on public.event_volunteers;
drop policy if exists "Staff can insert event signups" on public.event_volunteers;
create policy "Staff can insert signups (for on-the-spot check-in)" on public.event_volunteers
  for insert with check (public.is_staff(auth.uid()));


-- 3. ATTENDANCE LOGS TABLE
-- Logs exact check-in timestamps.
create table if not exists public.attendance_logs (
  id uuid default gen_random_uuid() primary key,
  volunteer_id uuid references public.profiles(id) on delete cascade not null,
  event_id text not null,
  checked_in_at timestamp with time zone default timezone('utc'::text, now()) not null,
  checked_out_at timestamp with time zone
);

-- 4. CHECK-IN SESSIONS TABLE
-- Stores active check-in sessions until checkout.
create table if not exists public.check_in_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_id text not null,
  check_in_time timestamp with time zone default timezone('utc'::text, now()) not null,
  check_out_time timestamp with time zone,
  hours_logged numeric default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.check_in_sessions enable row level security;

drop policy if exists "Users can view their own check-in sessions" on public.check_in_sessions;
drop policy if exists "Users can read own check-in sessions" on public.check_in_sessions;
create policy "Users can view their own check-in sessions" on public.check_in_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own check-in sessions" on public.check_in_sessions;
drop policy if exists "Users can create own check-in sessions" on public.check_in_sessions;
create policy "Users can insert their own check-in sessions" on public.check_in_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own check-in sessions" on public.check_in_sessions;
drop policy if exists "Users can update own check-in sessions" on public.check_in_sessions;
create policy "Users can update their own check-in sessions" on public.check_in_sessions
  for update using (auth.uid() = user_id);

drop policy if exists "Staff can view all check-in sessions" on public.check_in_sessions;
drop policy if exists "Staff can read all check-in sessions" on public.check_in_sessions;
create policy "Staff can view all check-in sessions" on public.check_in_sessions
  for select using (public.is_staff(auth.uid()));

drop policy if exists "Staff can insert check-in sessions" on public.check_in_sessions;
create policy "Staff can insert check-in sessions" on public.check_in_sessions
  for insert with check (public.is_staff(auth.uid()));

drop policy if exists "Staff can update check-in sessions" on public.check_in_sessions;
create policy "Staff can update check-in sessions" on public.check_in_sessions
  for update using (public.is_staff(auth.uid()));

-- Enable Row Level Security (RLS)
alter table public.attendance_logs enable row level security;

-- Policies for attendance_logs
drop policy if exists "Users can view their own attendance logs" on public.attendance_logs;
drop policy if exists "Users can read own attendance logs" on public.attendance_logs;
create policy "Users can view their own attendance logs" on public.attendance_logs
  for select using (auth.uid() = volunteer_id);

drop policy if exists "Staff can view all attendance logs" on public.attendance_logs;
drop policy if exists "Staff can read attendance logs" on public.attendance_logs;
create policy "Staff can view all attendance logs" on public.attendance_logs
  for select using (public.is_staff(auth.uid()));

drop policy if exists "Staff can insert attendance logs" on public.attendance_logs;
create policy "Staff can insert attendance logs" on public.attendance_logs
  for insert with check (public.is_staff(auth.uid()));

drop policy if exists "Staff can update attendance logs" on public.attendance_logs;
create policy "Staff can update attendance logs" on public.attendance_logs
  for update using (public.is_staff(auth.uid()));


-- 5. VOLUNTEER HOUR ADJUSTMENTS TABLE
-- Optional audit log for manual hour changes made by staff.
create table if not exists public.volunteer_hour_adjustments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  adjusted_by uuid references public.profiles(id) on delete set null,
  hours numeric not null,
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.volunteer_hour_adjustments enable row level security;

drop policy if exists "Staff can view hour adjustments" on public.volunteer_hour_adjustments;
create policy "Staff can view hour adjustments" on public.volunteer_hour_adjustments
  for select using (public.is_staff(auth.uid()));

drop policy if exists "Staff can insert hour adjustments" on public.volunteer_hour_adjustments;
create policy "Staff can insert hour adjustments" on public.volunteer_hour_adjustments
  for insert with check (public.is_staff(auth.uid()));


-- 6. HELPER TRIGGERS (OPTIONAL)
-- Automatically creates a profile record when a new user signs up via Auth (SSO or Email).
-- Note: This requires extracting fullName/member_code. If skipped, profiles are inserted
-- directly by the client code during email signup, but this is a useful fallback.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, member_code, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'POT Volunteer'),
    new.email,
    'POT-' || (floor(random() * 900000) + 100000)::text,
    case when new.email like '%staff%' then 'staff' else 'volunteer' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Trigger definition
-- Keeps profile creation reliable even when email confirmation is enabled and
-- the browser does not receive an authenticated session immediately after signup.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
