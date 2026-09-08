# Pillars of Tech Full Website and Live Contact Implementation Plan

**Base:** `f3a0a40155e595edf5394dcd6bb41a2056a58e57` (`andrew/workshop-print-motion`)

**Implementation branch:** `andrew/family-full-site-live-chat`

## Global constraints

- Preserve existing event registration, volunteer accounts, volunteer check-in, staff authentication, administration, donations, transparency, media, CSV export, and RLS behavior.
- Staff privilege remains database-controlled through `public.staff_members` keyed by Supabase Auth `user_id`. Email strings, profile metadata, client checks, and Discord role membership alone never confer staff access.
- All anonymous contact/chat database access goes through validated server APIs. Anonymous and ordinary authenticated roles receive no direct chat-table privileges.
- Use the approved family design system on public pages: `#0D2B4A` navy, `#17334D` ink, `#DED5C7` toned oatmeal, `#F7F3EB` paper, `#B9DDEC` sky, `#F7CA55` sun, `#E9A98F` coral, and `#AAC6A5` green; Fredoka headings; Atkinson Hyperlegible body; rounded cards and pill controls; real Pillars of Tech photography only.
- The memorable visual signature is an “open workshop window”: the two approved timelapses alternate silently behind the homepage hero. There is no video control bar and no scroll-controlled rover sequence. Respect `prefers-reduced-motion`, keep a poster visible before video loads, and never autoplay audio.
- Public copy must be plain, warm, specific, and useful to parents unfamiliar with technology. Avoid emoji decoration, jargon, guaranteed response times, unverifiable impact claims, and AI-generated people.
- Public navigation prioritizes `For families`, `Events`, `Our work`, `Volunteer`, `Branches`, and `Contact`; support routes remain in a labeled menu/footer. The rounded `Questions?` launcher appears on every public route, but never on `/admin*` or `/volunteer/checkin`.
- Office hours are Monday through Friday, 4:00–10:00 PM in `America/Los_Angeles`. Live state requires both the schedule and an explicit approved-staff queue toggle. The schedule always closes the queue after 10:00 PM.
- Live chat requires a display name and accepts optional email. After-hours contact requires email. Show the under-13 guardian notice and a safety notice forbidding passwords, home addresses, school schedules, medical information, and emergency requests.
- Chat v1 has no files, voice/video calls, visitor accounts, Discord invites/usernames, public Discord access, chatbot/AI replies, or response-time promise.
- Visitor auth uses a random 32-byte opaque token in an `HttpOnly`, `Secure` in production, `SameSite=Lax`, path-scoped cookie. Store only an HMAC/keyed hash using `CHAT_TOKEN_PEPPER`; use constant-time comparisons where applicable.
- Contact/chat inputs use strict Zod schemas, same-origin checks, honeypots, bounded plain text, server-owned Discord destinations, and durable database rate limits. Messages render only as text. Never log message bodies, emails, tokens, webhook URLs, Discord secrets, or service-role credentials.
- Completed or spam chats and their messages are deleted after 30 days through a protected daily retention endpoint/job. Open conversations are not deleted merely because they are old.
- Discord uses a server-only bot/application and signed HTTP interactions in one private `#website-live-chat` channel with one thread per website conversation. Verify signature, application, guild, channel/thread relationship, allowed role, and active `staff_discord_identities` mapping linked to `staff_members.user_id`.
- Georgia is implemented as typed branch content and branch-aware events, but `/ga` returns `notFound()` and is excluded from sitemap until a complete approved packet is published. Do not show a public coming-soon claim.
- Tests must assert real behavior and failure paths. Run focused tests during work and `npm run check` before each task commit. Do not weaken existing tests to accommodate the redesign; replace obsolete workshop-only assertions with requirement-level assertions.

## Task 1: Family design foundation and approved homepage

Implement the shared visual system and homepage from the approved prototype.

- Replace `src/lib/fonts.ts` with Fredoka for display and Atkinson Hyperlegible for body through `next/font/google`, preserving CSS variables and graceful fallbacks.
- Update Tailwind tokens and `src/app/globals.css` to the exact global palette. Establish reusable classes/components for rounded buttons, cards, page shells, section headers, focus rings, form controls, status pills, and readable long-form copy. Keep 44px minimum interactive targets and visible keyboard focus.
- Replace `Navbar` and `Footer` with the locked information architecture. Keep mobile dialog focus trapping, Escape close, focus return, body scroll restoration, route close, and no rendering in admin/check-in.
- Remove `PublicAtmosphere` and the scroll-height `WorkshopAssembly` homepage use. Delete obsolete workshop-only components/assets only when no route/test references them.
- Copy the approved prototype assets from `/Users/al1234/.codex/visualizations/2026/08/24/01a03129-c87d-7672-9a42-5e49eab2f074/front-page-example/assets/` into stable public paths. Use both optimized 720p MP4 files and both posters, not the large MOV files. Reuse existing curated real-event images when equivalent.
- Build an accessible client `TimelapseHero` that starts with the Wildcat Tank poster/video, attempts muted inline autoplay, alternates between the two videos after each playback interval/end, and has no controls. If autoplay fails or reduced motion is requested, keep a useful static poster. Pause when the page is hidden. Avoid downloading the second video eagerly.
- Rebuild `/` with: timelapse hero; three trust points; plain three-step “new to tech” introduction; next-event data from the existing repository; real-event proof; mission/work explanation; California and non-linking Georgia branch cards; financial transparency; and contact CTA. Never claim a Georgia launch.
- Keep existing data repository failure handling and preserve real links to events, contact, HCB transactions, volunteer, and donation routes.
- Add/replace focused tests for tokens, fonts, hero asset behavior, absence of controls/scroll rover, header/footer IA, reduced-motion fallback, homepage content ordering, and existing data behavior. Run `npm run check` and commit.

## Task 2: Public route migration and support pages

Apply the family design system to every existing public route while preserving functional behavior.

- Redesign `/about`, `/team`, `/events`, `/events/[id]`, `/register/[eventId]`, `/volunteer`, `/wildcat-tank`, `/photos/wildcat-tank`, `/fundraiser`, `/wishlist`, `/newsletter`, `/faq`, and `/contact` page shells/components with rounded, readable layouts. Keep `/volunteer/checkin` staff-oriented and visually separate.
- `/about`: mission, history, hands-on approach, Hack Club fiscal sponsorship, public financial record, and honest impact methodology.
- `/team`: approved existing names, roles, portraits, team application path, and volunteer route; do not invent people or roles.
- `/events`: clear upcoming/ongoing/completed/cancelled filters and branch labels without breaking current data loading.
- `/events/[id]`: description, age guidance where data exists, accessibility/help guidance, date, location, schedule, materials, participant registration, volunteering, cancellation state, and approved gallery. Do not invent missing facts; explain how to ask.
- `/register/[eventId]`: preserve dynamic form validation/privacy/success receipt/closed-event behavior.
- `/volunteer`: preserve Google/Supabase sign-in, registration, history, member code, and hours.
- `/wildcat-tank`: keep program explanation, judges, results, manual, linked event, timelapse, and gallery.
- `/fundraiser`: preserve secure HCB donation and public transaction ledger/fiscal-sponsorship explanation.
- `/wishlist`: group existing requested equipment by purpose and direct coordination to Contact.
- `/newsletter`: expectations, existing signup path, archive link if already verified, and event-update explanation.
- `/faq`: group questions for families, students, volunteers, schools, safety, registration, and contact.
- Add `/privacy` and `/accessibility` with the exact chat/privacy/accessibility commitments in the global constraints, direct contact help, and honest known limitations.
- Add friendly `not-found.tsx`, root `error.tsx`, and `global-error.tsx` without leaking internal details. Add per-page metadata for public routes where absent.
- Update tests to verify each route’s required trust content, links, and preserved form/auth behavior. Run `npm run check` and commit.

## Task 3: Durable email contact and protected contact inbox

Preserve the existing contact contract while adding the two-choice experience and durable abuse controls.

- Keep `POST /api/contact`, its strict schema, honeypot, private `contact_submissions` storage, and generic failure responses. Add same-origin validation for unsafe methods.
- Replace the process-local contact throttle with a durable database-backed rate limiter shared by contact and chat. Hash normalized request identity with `CHAT_TOKEN_PEPPER` before storage; do not store raw IPs. Use a bounded transaction/RPC that prunes/updates one bucket atomically. Fail closed with a generic 503 when required server configuration or the database is unavailable.
- Add a migration for durable rate-limit buckets if Task 4 has not yet added the shared table. Grant only server/service operations required; no anonymous/authenticated direct access. Add indexes/constraints and SQL policy tests.
- Rebuild `/contact` with equal `Live chat with us` and `Email us` cards. The email card opens/focuses the protected form and keeps `pillarsoftech@gmail.com` visible as fallback. Retain all existing legitimate form fields and require email for this form.
- Add protected `/admin/contact` UI and `/api/admin/contact` operations to list bounded/paginated submissions and update status (`new`, `in_progress`, `resolved`, `spam`). Use existing verified-staff server authorization and never client email checks. Add DB status/check/index support without exposing submissions.
- Add tests for schema strictness, same-origin behavior, durable limiter outcomes, error redaction, staff/non-staff authorization, pagination/status changes, and contact UI behavior. Run `npm run check` plus relevant SQL tests when local Supabase is available, then commit.

## Task 4: Live chat database, server APIs, Discord bridge, and retention

Implement the security-critical chat backend as focused server modules with testable boundaries.

- Add migrations for `chat_conversations`, `chat_messages`, `chat_office_hours`, `chat_queue_state`, `chat_rate_limit_buckets` (or reuse Task 3’s shared table), and `staff_discord_identities`. Use UUID primary keys, timestamps, bounded check constraints, foreign keys with indexes, and partial indexes for active/retry queues. Enable and force RLS; revoke all anonymous/authenticated table access except explicitly reviewed staff reads/operations. Staff mappings reference `staff_members.user_id`; service role cannot create/update/delete staff membership.
- Seed the canonical Monday–Friday 16:00–22:00 `America/Los_Angeles` schedule without making the queue open. Implement deterministic timezone-aware availability and next-opening helpers, including weekends and DST.
- Add `GET /api/chat/availability`, `POST /api/chat/conversations`, `GET /api/chat/messages?after=<cursor>`, and `POST /api/chat/messages`. Use strict schemas, same-origin enforcement, honeypot, durable throttling, no-store responses, visitor token cookie ownership, stable generic errors, bounded pagination/cursors, and closed-conversation enforcement.
- Reject client-supplied webhook/channel destinations, unknown fields, HTML/markup, oversized content, and unsafe URL destinations. Ordinary punctuation in plain-text questions remains allowed; do not corrupt text.
- Add a Discord REST client that reads only server environment variables, creates one private channel thread per conversation, posts visitor messages with server-generated identifiers and `Reply`/`Close`/`Mark spam` components, records delivery state, and preserves failed messages for admin retry. Never place visitor email in Discord message content.
- Add `POST /api/integrations/discord/interactions`. Verify the Ed25519 signature over timestamp + raw request body before JSON parsing; support Discord ping, authorized button actions, reply modal, modal submission, and queue open/close. Verify application, guild, parent channel/thread, configured allowed role, and an active DB mapping that resolves to an existing `staff_members` row. Make actions idempotent and return within Discord’s interaction window.
- Add protected `/api/admin/chats` endpoints for paginated listing, transcript reads, reply, close, spam, delivery retry, and queue control. Require existing server-side verified staff checks.
- Add a protected daily retention route suitable for Vercel Cron, authenticated with a dedicated server secret or platform cron authorization, deleting only resolved/spam conversations whose terminal timestamp is older than 30 days. Add `vercel.json` schedule only if it does not overwrite existing deployment settings.
- Add unit/integration/SQL tests for availability boundaries/DST, token ownership/isolation/expiry, strict inputs, signature failures, guild/channel/role/mapping failures, idempotency, delivery preservation/retry, queue auto-close, and retention cutoff. Run `npm run check` and all runnable SQL tests, then commit.

## Task 5: Visitor chat widget and staff chat dashboard

Build the browser surfaces on top of Task 4 APIs without leaking implementation details.

- Add a rounded `Questions?` launcher globally on every public page; omit it from admin/check-in. It must be keyboard operable, expose live/offline state without color alone, avoid covering content at 320px, and respect reduced motion.
- Build an accessible dialog/drawer with focus trap/return, Escape close, labelled status, live region for new replies, safety notice, under-13 guardian notice, and the two contact choices.
- When live, require display name, allow optional email, create/resume the cookie-bound conversation, send bounded plain-text messages, poll every 3 seconds only while open/visible, back off when inactive/errors occur, and stop when closed. Do not persist transcript/email/name in localStorage.
- When `scheduled_offline` or `closed`, show Pacific office hours and the computed next opening, and route `Leave a message` to the contact form. Never suggest an immediate response.
- Add `/admin/chats` with queue state, bounded list, transcript, verified staff reply, close/spam/retry controls, clear delivery failure states, and safe text rendering. Add the navigation item to `AdminShell`.
- Add component/API-contract tests for launcher placement, keyboard dialog behavior, polling lifecycle/backoff, no localStorage transcript, offline routing, safe rendering, and staff actions. Run `npm run check` and commit.

## Task 6: Branch content, unpublished Georgia, metadata, and release surfaces

Finish branch-aware content and release-facing discovery surfaces.

- Add `branch` to event schemas/types/storage with allowed values `ca` and `ga`; default existing rows and local JSON events to `ca`. Preserve public/admin event CRUD compatibility and include clear branch labels/filters.
- Add typed branch content storage/contracts for California and Georgia, including service area, leaders/roles, programs, contact route, photos with alt text, events, CTAs, and publication state. Reject publish when any required Georgia packet field or approved media/alt text is missing.
- Add protected `/admin/branches` and corresponding server API using existing staff authorization. Do not add public owner provisioning.
- Add `/ga` that calls `notFound()` unless a complete Georgia document is published; ensure no unpublished fields render or enter metadata/structured data.
- Add `sitemap.ts` and `robots.ts`. Include only real public routes and published event routes; exclude `/admin`, `/api`, auth/check-in, registration forms, and unpublished Georgia.
- Add Organization JSON-LD globally and Event JSON-LD on published event detail pages using only validated public fields. Escape `<` in serialized JSON and never include private registration data.
- Add safe cache headers where appropriate, verify CSP compatibility, and document all owner-managed environment variables plus preview-first Discord/Supabase/Vercel configuration and independent chat rollback steps in the security release runbook.
- Add tests for branch defaults/contracts, Georgia publish gate/not-found behavior, sitemap exclusions, robots rules, JSON-LD safety, route metadata, and preserved event CRUD. Run `npm run check`, `npm run build`, `npm audit --audit-level=low`, workflow-pin validation, and YAML parsing; commit.

## Final acceptance

- Reset a fresh local Supabase database and run every SQL policy test when the Supabase CLI/runtime is available; otherwise record the exact blocker and do not claim SQL execution.
- Run a full public-route crawl and separately exercise anonymous, volunteer, verified staff, and non-staff behavior that can be configured locally.
- In a real browser, verify desktop, tablet, 390px, and 320px layouts, keyboard navigation, focus visibility, chat dialog interaction, reduced motion, no overflow, no broken media, no framework overlay, and no relevant console errors.
- Target Lighthouse 90+ for Accessibility, Best Practices, and SEO on preview; report actual scores only if run.
- Production acceptance additionally requires the owner-managed hosted website-message → private Discord thread → mapped staff modal reply → website display flow with synthetic data. Local mocks do not prove hosted configuration.
