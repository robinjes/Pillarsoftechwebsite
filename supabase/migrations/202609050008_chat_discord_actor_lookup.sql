-- Task 4B interaction authorization lookup.
--
-- The server service role intentionally has no direct privilege on
-- staff_members.  Resolve a Discord identity to an Auth user only through a
-- narrow SECURITY DEFINER function that requires both an active mapping and
-- an existing staff_members row.  Browser roles and the service role cannot
-- query either underlying table through PostgREST.

create or replace function public.lookup_chat_discord_staff_actor(
  p_discord_actor_id text
)
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select mapping.user_id
  from public.staff_discord_identities as mapping
  join public.staff_members as staff
    on staff.user_id = mapping.user_id
  where p_discord_actor_id is not null
    and p_discord_actor_id ~ '^[0-9]{1,30}$'
    and mapping.discord_user_id = p_discord_actor_id
    and mapping.active = true
  limit 1;
$$;

revoke all on function public.lookup_chat_discord_staff_actor(text)
from public, anon, authenticated, service_role;
grant execute on function public.lookup_chat_discord_staff_actor(text)
to service_role;
