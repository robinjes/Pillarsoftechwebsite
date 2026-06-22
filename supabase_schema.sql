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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Staff can view all profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'staff'
    )
  );


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
create policy "Users can view their own signups" on public.event_volunteers
  for select using (auth.uid() = user_id);

create policy "Users can register themselves" on public.event_volunteers
  for insert with check (auth.uid() = user_id);

create policy "Staff can view all signups" on public.event_volunteers
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'staff'
    )
  );

create policy "Staff can update signups (for check-in)" on public.event_volunteers
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'staff'
    )
  );

create policy "Staff can insert signups (for on-the-spot check-in)" on public.event_volunteers
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'staff'
    )
  );


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

create policy "Users can view their own check-in sessions" on public.check_in_sessions
  for select using (auth.uid() = user_id);

create policy "Staff can view all check-in sessions" on public.check_in_sessions
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'staff'
    )
  );

create policy "Staff can insert check-in sessions" on public.check_in_sessions
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'staff'
    )
  );

create policy "Staff can update check-in sessions" on public.check_in_sessions
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'staff'
    )
  );

-- Enable Row Level Security (RLS)
alter table public.attendance_logs enable row level security;

-- Policies for attendance_logs
create policy "Users can view their own attendance logs" on public.attendance_logs
  for select using (auth.uid() = volunteer_id);

create policy "Staff can view all attendance logs" on public.attendance_logs
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'staff'
    )
  );

create policy "Staff can insert attendance logs" on public.attendance_logs
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'staff'
    )
  );


-- 4. HELPER TRIGGERS (OPTIONAL)
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
$$ language plpgsql security definer;

-- Trigger definition (uncomment below if using DB auto-profile trigger)
-- drop trigger if exists on_auth_user_created on auth.users;
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute procedure public.handle_new_user();
