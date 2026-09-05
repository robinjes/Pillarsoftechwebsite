-- Owner-run Discord identity mapping template.
--
-- Replace both placeholders out of band with an existing Supabase Auth UUID
-- that already has a public.staff_members row and the exact Discord user ID.
-- Do not replace the UUID with an email, profile field, Discord username, or
-- client-supplied value. Run as the approved database owner/operator only;
-- the application service role is intentionally not a staff-membership writer.

begin;

do $$
declare
  v_staff_user_id uuid := '<STAFF_AUTH_USER_UUID>'::uuid;
  v_discord_user_id text := '<DISCORD_USER_ID>';
begin
  if not exists (
    select 1
    from public.staff_members
    where user_id = v_staff_user_id
  ) then
    raise exception 'The supplied Auth UUID is not an existing staff member.';
  end if;

  if v_discord_user_id !~ '^[0-9]{1,30}$' then
    raise exception 'The supplied Discord user ID is not a numeric snowflake.';
  end if;

  -- A conflict is intentionally an error. Review the existing owner mapping
  -- before changing it; do not silently reassign a Discord identity.
  insert into public.staff_discord_identities (user_id, discord_user_id, active)
  values (v_staff_user_id, v_discord_user_id, true);
end;
$$;

commit;

-- To retire a mapping, use a separately reviewed owner transaction. Never
-- delete staff membership as part of Discord setup:
--
-- begin;
-- update public.staff_discord_identities
-- set active = false
-- where discord_user_id = '<DISCORD_USER_ID>';
-- commit;
