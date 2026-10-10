-- Confirm the Career Panel schedule from its October 28 poster.
begin;

update public.events
set starts_at = '2026-10-29T00:30:00.000Z'::timestamptz,
    ends_at = '2026-10-29T03:30:00.000Z'::timestamptz,
    timezone = 'America/Los_Angeles',
    start_label = 'October 28, 2026',
    end_label = '5:30 PM - 8:30 PM'
where id = 'career-panel-granada';

commit;
