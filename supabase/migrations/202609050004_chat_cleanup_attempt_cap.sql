-- Task 2 cleanup reconciliation attempt cap.
--
-- An expired claim is first normalized to uncertain so its external-delete
-- result can be reconciled.  The explicit uncertain claim is the only path
-- that starts another external attempt, so it owns the bounded counter.

create or replace function public.list_chat_cleanup_jobs(
  p_limit integer
)
returns setof public.chat_cleanup_jobs
language sql
security definer
set search_path = ''
as $$
  with now_value as (select clock_timestamp() as now_at)
  select job.*
  from public.chat_cleanup_jobs job
  cross join now_value n
  where (
    job.state in ('pending', 'failed')
    and job.attempt_count < 20
    and (job.next_retry_at is null or job.next_retry_at <= n.now_at)
  )
  or (job.state = 'uncertain' and job.attempt_count < 20)
  or (job.state = 'claimed'
      and job.attempt_count < 20
      and job.lease_expires_at <= n.now_at)
  order by job.created_at asc, job.id asc
  limit least(greatest(coalesce(p_limit, 1), 1), 50);
$$;

revoke all on function public.list_chat_cleanup_jobs(integer) from public, anon, authenticated, service_role;
grant execute on function public.list_chat_cleanup_jobs(integer) to service_role;

create or replace function public.claim_uncertain_chat_cleanup_job(
  p_job_id uuid,
  p_claim_token uuid,
  p_lease_seconds integer
)
returns public.chat_cleanup_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleanup_row public.chat_cleanup_jobs;
  now_at timestamptz;
begin
  if p_job_id is null or p_claim_token is null or p_lease_seconds not between 1 and 300 then
    raise exception 'invalid uncertain cleanup claim' using errcode = '22023';
  end if;
  select * into cleanup_row from public.chat_cleanup_jobs where id = p_job_id for update;
  if not found then raise exception 'cleanup job was not found' using errcode = 'P0002'; end if;
  if cleanup_row.state <> 'uncertain' then raise exception 'cleanup job is not uncertain' using errcode = 'P0007'; end if;
  if cleanup_row.attempt_count >= 20 then
    raise exception 'cleanup attempts exhausted' using errcode = 'P0010';
  end if;
  now_at := clock_timestamp();
  update public.chat_cleanup_jobs
  set state = 'claimed', claim_token = p_claim_token,
      lease_expires_at = now_at + pg_catalog.make_interval(secs => p_lease_seconds),
      attempt_count = attempt_count + 1
  where id = cleanup_row.id
  returning * into cleanup_row;
  return cleanup_row;
end;
$$;

revoke all on function public.claim_uncertain_chat_cleanup_job(uuid, uuid, integer)
from public, anon, authenticated, service_role;
grant execute on function public.claim_uncertain_chat_cleanup_job(uuid, uuid, integer)
to service_role;
