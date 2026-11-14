-- Reviewable content update for the two completed California events.
-- Apply through the existing operator release workflow; app startup and builds
-- do not execute this file. Preserves publication state, media, schedules,
-- resources, capacities, outcomes, and audit actor fields.
-- Both existing rows must be present or the entire transaction rolls back.

begin;

do $$
declare
  changed_rows integer;
begin
  update public.events
  set status = 'completed',
      participant_registration_state = 'closed',
      volunteer_registration_state = 'closed',
      summary = 'What does a career in STEM actually look like? At Granada High School, Pillars of Tech brought students and STEM professionals together for an evening of honest advice, career stories, and conversations about where a curiosity for science can lead.',
      description = 'What does a career in STEM actually look like? At Granada High School, Pillars of Tech brought students and STEM professionals together for an evening of honest advice, career stories, and conversations about where a curiosity for science can lead.

The first panel featured Matthew Johnson, Anna Winter, Mark Dedon, Randy Simpson, and Joel Bowers. They shared perspectives on field research, working through setbacks in the lab, and opportunities across earth science, atmospheric research, conservation, climate technology, and national security. The discussion gave students a closer look at both the exciting discoveries and the persistence behind scientific work.

Amy Aines, Yolanda Fintschenko, Roger Aines, and Russ Walsh joined the second panel to talk about building a future in STEM. Topics included bringing research into the real world, communicating ideas through storytelling, standing out early in a career, and finding mentors along the way.

An open Q&A gave attendees space to ask their own questions, and the conversations continued afterward as students connected with panelists one-on-one. Thank you to all nine speakers, our partners at Livermore and Granada HOSA, and everyone who joined us for an evening of exploring possibilities and making connections.'
  where id = 'career-panel-granada';

  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'Expected one existing career-panel-granada event; changed % rows.', changed_rows;
  end if;

  update public.events
  set status = 'completed',
      participant_registration_state = 'closed',
      volunteer_registration_state = 'closed',
      summary = 'Pillars of Tech hosted STEM Into the Night in partnership with the Junction Avenue K-8 STEM class, bringing students and community partners together for an evening of hands-on STEM exploration.',
      description = 'Pillars of Tech hosted STEM Into the Night in partnership with the Junction Avenue K-8 STEM class, bringing students and community partners together for an evening of hands-on STEM exploration.

Students explored engineering and creative problem-solving through an index card boat activity, a robot hand activity, pixel graphing, and an index card tower challenge. Rocket launchers and a physics activity added more opportunities to explore science in action.

Health and science activities included CPR training, building a model heart, and learning how to use a stethoscope.

Thank you to the Junction STEM class and our community partners, including the Green Engineering Academy from Livermore High School and Diabetes Smart, for helping bring the evening to life.

Learn more about the Green Engineering Academy at www.livermoregea.org and Diabetes Smart at diabetessmart.org.'
  where id = 'stem-into-the-night-2026';

  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'Expected one existing stem-into-the-night-2026 event; changed % rows.', changed_rows;
  end if;
end;
$$;

commit;
