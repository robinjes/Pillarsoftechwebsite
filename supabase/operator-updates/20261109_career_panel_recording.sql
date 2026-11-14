-- Add the Career Panel recording without replacing existing photo fields.
-- Apply through the existing operator release workflow.
begin;

update public.events
set media = coalesce(media, '{}'::jsonb) || jsonb_build_object(
  'youtubeVideos', jsonb_build_array('https://www.youtube.com/watch?v=y1XDEbn9zpk')
)
where id = 'career-panel-granada';

commit;
