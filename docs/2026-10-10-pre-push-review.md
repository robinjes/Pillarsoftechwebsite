# Website review — October 10, 2026

The local production build and public-page review passed. Hosted workflows still require a configured staging check before deployment.

## Corrections made during review

- Event cards, detail galleries, and hero videos now accept finalized public Supabase media URLs. Images also accept the configured Cloudinary account. Unconfigured hosts, private storage URLs, and unsafe paths remain excluded.
- The homepage preview uses the selected event's own poster, displays it without cropping, and no longer assigns every event the same unsupported audience.
- Private staff PDF upload references no longer appear as public event document links. They remain available in the staff event record.
- Updated a stale test to expect Jaden's replacement portrait.

## Validation completed

- `npm run check`: lint, TypeScript, and 335 tests in 59 files passed.
- `npm run build`: final production build passed, with the site's real Google Fonts downloaded.
- `npm audit --audit-level=low`: zero reported vulnerabilities.
- Workflow validation passed for all three workflow files; YAML parsing and `git diff --check` passed.
- Reviewed 28 routes at desktop and mobile widths, including all ten event details, the registration page, and an intentional missing-event route. No runtime exceptions, broken images, horizontal overflow, duplicate IDs, or broken internal destinations were found. The intentional missing-event route returned 404.
- Exercised navigation dropdowns and mobile menu/Escape, event ordering, both event sections, filters/reset/search, gallery open/close, team holograms/reduced motion, Jaden's crop, and the homepage poster on the final production build.
- Exercised contact-form success with a simulated local response. No real message or registration was submitted.
- Executed the new event-deletion migration and the three content corrections in an isolated PostgreSQL 15 database. Confirmed that schedules/posters were updated, unrelated media/resources were preserved, school-only participant links were removed, and soft deletion retained attendance/earned hours while preventing republication.

## Deployment prerequisites and remaining verification

Follow the staging and backup procedure in `security-release-runbook.md`. No hosted database changes were made during this review.

1. Apply `supabase/migrations/202610100001_event_deletion.sql` before rolling out the new admin event code. The admin repository now queries `deleted_at`; an older schema will cause admin event operations to fail.
2. For existing hosted event rows, apply the content corrections:
   - `supabase/operator-updates/20261010_career_panel_poster.sql`
   - `supabase/operator-updates/20261010_career_panel_schedule.sql`
   - `supabase/operator-updates/20261010_junction_school_registration.sql`
3. Verify real Google sign-in, staff access, event create/edit/delete, storage upload, participant/volunteer registration, and contact-message persistence against a configured staging database. This checkout has no Supabase configuration; automated tests cover these paths with controlled fixtures, while the browser confirmed that unconfigured protected tools remain closed.
4. Run the full Supabase migration/pgTAP suite in CI or staging. Docker is unavailable locally, so the full Supabase stack was not run; the isolated PostgreSQL checks above do not establish hosted policies or grants.
5. Include the new portrait/poster assets, components, helpers, tests, and SQL files when staging the commit. Several are currently untracked. Use Node 24.15 or newer, as declared by the package engines.
