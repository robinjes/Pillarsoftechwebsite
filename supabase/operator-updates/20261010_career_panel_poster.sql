-- Update the Career Panel poster while preserving all other event media.
begin;

update public.events
set media = coalesce(media, '{}'::jsonb) || jsonb_build_object(
  'image', '/images/events/career-panel-granada/poster.png',
  'heroImage', '/images/events/career-panel-granada/poster.png',
  'imageAlt', 'Career Panel poster from Pillars of Tech and HOSA: October 28, 5:30–8:30 PM at Granada High School in Livermore, CA, with panelists from NASA, Sandia, and LLNL.',
  'heroImageAlt', 'Career Panel poster from Pillars of Tech and HOSA: October 28, 5:30–8:30 PM at Granada High School in Livermore, CA, with panelists from NASA, Sandia, and LLNL.'
)
where id = 'career-panel-granada';

commit;
