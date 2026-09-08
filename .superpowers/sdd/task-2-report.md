# Task 2 report: public route migration and support pages

## Status

Implemented Task 2 on `andrew/family-full-site-live-chat`. The existing public data, registration, volunteer authentication/account/history, media, donation, newsletter, contact, and check-in contracts remain in place. `/volunteer/checkin` was intentionally left outside the public Navbar/Footer shell.

## Implementation

- Migrated the public About, Team, Events, event detail, registration, Volunteer, Wildcat Tank, photo archive, fundraiser, wishlist, newsletter, FAQ, and Contact surfaces to the reviewed family visual language with rounded shells, readable hierarchy, status/help copy, and real existing media.
- Added About impact methodology language that distinguishes sourced recorded activity from outcomes, retained Hack Club/HCB financial transparency, and linked questions to Contact.
- Added explicit Upcoming/Ongoing/Completed/Cancelled event filters and California/Georgia branch labels while retaining `/api/events` loading and existing registration/volunteer actions. Current legacy rows display California until Task 6 adds the typed branch field.
- Added event planning cards for age guidance, materials, and accessibility/help that disclose when the current record does not contain a fact rather than inventing one; retained event schedule, approved gallery, registration, volunteer, and cancellation behavior.
- Preserved dynamic registration validation/privacy/closed states and now displays the API confirmation ID when the success response supplies one. Preserved Volunteer Google/Supabase sign-in, signup/history/member-code/hours behavior.
- Grouped the existing wishlist by purpose and kept Contact coordination; retained the verified HCB donation/ledger paths, newsletter signup/embed/archive links, Wildcat Tank manual/results/judges/event/timelapse/gallery, and protected Contact form endpoint/honeypot.
- Added `/privacy` and `/accessibility` with the approved chat safety, token, validation, retention, office-hours, under-13, no-file/no-AI, accessibility, direct-help, and known-limitations commitments. Added support navigation links.
- Added redacted friendly `not-found.tsx`, `error.tsx`, and `global-error.tsx`, plus route metadata for previously uncovered public/client routes through page or nested layout metadata.

## Files

Changed route/components: `src/app/about/page.tsx`, `src/app/contact/page.tsx`, `src/app/events/page.tsx`, `src/app/events/[id]/page.tsx`, `src/app/faq/page.tsx`, `src/app/fundraiser/page.tsx`, `src/app/newsletter/page.tsx`, `src/app/register/[eventId]/page.tsx`, `src/app/team/page.tsx`, `src/app/volunteer/page.tsx`, `src/app/wildcat-tank/page.tsx`, `src/app/wishlist/page.tsx`, `src/components/About.tsx`, `src/components/CloudinaryPhotoGallery.tsx`, `src/components/Contact.tsx`, `src/components/Footer.tsx`, `src/components/Navbar.tsx`, `src/components/Team.tsx`.

Added support/error/metadata routes: `src/app/privacy/page.tsx`, `src/app/accessibility/page.tsx`, `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/events/layout.tsx`, `src/app/events/[id]/layout.tsx`, `src/app/register/layout.tsx`, `src/app/register/[eventId]/layout.tsx`, `src/app/volunteer/layout.tsx`.

Added requirement tests: `tests/task-2-public-routes.test.ts`.

## RED/GREEN evidence

- RED: the new focused suite was run before implementation and reported 6 failing requirement assertions for missing Task 2 surfaces.
- GREEN focused: `npm test -- --run tests/task-2-public-routes.test.ts` — 1 file, 9 tests passed (16:09:04).
- GREEN full: `npm run check` — lint passed, typecheck passed, 34 test files / 185 tests passed (16:11:40).
- Build: `npm run build` — Next.js 15.5.23 compiled, lint/type validity passed, and all 44 static pages generated. The only output warning is the existing 15-month-old Browserslist database notice.

## Rendered smoke

Using the cached Chromium browser in production mode (`npm run start -- --hostname 127.0.0.1`): `/about` at 1440x900 and `/events` at 390x844 rendered with expected navigation, hierarchy, rounded event shell, status filters, and imagery; `/privacy` loaded with the complete support copy and footer links. `playwright console` reported 0 errors and 0 warnings on the final production run. A 320px events pass also retained readable stacked controls; temporary browser artifacts were moved outside the worktree.

## Concerns / follow-up boundaries

- The public contract currently has no age/materials/accessibility fields, so event detail cards deliberately provide contact/help guidance for absent facts. Task 6 can wire approved typed fields without changing the presentation fallback.
- Legacy event records do not yet carry a typed branch; the display falls back to California for current published local rows and recognizes a future `branch: 'ga'` value. Task 6 owns the authoritative branch contract and Georgia publication gate.
- Live chat launcher/visitor behavior and staff inbox remain intentionally deferred to Tasks 3–5; this task only publishes the privacy/accessibility commitments and preserves the current protected Contact form.

## Review follow-up

- Removed the pre-Task-6 untyped branch cast. Events now render the neutral `Branch not listed` label for legacy records and never inspect a client-supplied `branch` property; Task 6 owns the validated branch contract and California default.
- Filter-specific current-event headings now read `Upcoming programs` or `Ongoing programs`, with matching empty messages (`No upcoming events match this search.` / `No ongoing events match this search.`). The all-events view retains `Upcoming & ongoing` and its planning copy.
- Added `tests/events-page-rendered.test.tsx`, a jsdom/Testing Library test with mocked `/api/events` records. It exercises both filters, visible pressed labels/headings, neutral unknown-branch rendering, and the Ongoing empty state.
- Review validation: `npm test -- --run tests/task-2-public-routes.test.ts tests/events-page-rendered.test.tsx` — 2 files / 11 tests passed (16:25:30). `npm run check` — lint and typecheck passed, 35 test files / 187 tests passed (16:25:38). No build/browser rerun was needed because the review changes are limited to the EventsPage branch/filter rendering and tests.
