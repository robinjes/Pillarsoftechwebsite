# Task 3 report: durable email contact and protected contact inbox

## Status

Implemented Task 3 on `andrew/family-full-site-live-chat`. The public contact contract remains strict and private, while the contact surface now presents equal planned-live-chat and email paths. Staff contact operations use the existing verified `staff_members` authorization path.

## Implementation

- Replaced the production process-local contact throttle with a server-only HMAC identity boundary and an atomic, bounded/prunable `chat_rate_limit_buckets` RPC shared by contact and the future chat surface. Missing `CHAT_TOKEN_PEPPER`, unavailable Supabase configuration, RPC errors, and malformed limiter results fail closed with a generic 503.
- Added same-origin validation for the public contact POST and the protected status mutation, retained the honeypot/strict schema/private insert, and preserved the direct `pillarsoftech@gmail.com` fallback without accepting destinations or webhooks.
- Added `/admin/contact` with bounded keyset pagination and exact `new`, `in_progress`, `resolved`, and `spam` status updates. Responses expose private submissions only after server-side staff verification; the UI performs no email/profile/client privilege checks.
- Added status constraints, keyset/filter/prune indexes, forced RLS, least-privilege grants, explicit staff read/update policies, and pgTAP coverage in the new migration/test pair.

## Validation

- Focused: `npx vitest run tests/task-3-contact.test.ts tests/contact-rate-limit.test.ts tests/contact-abuse.test.ts` — 3 files / 15 tests passed.
- Full: `npm run check` — lint and typecheck passed; 37 test files / 199 tests passed.
- Build: `npm run build` — Next.js 15.5.23 compiled and all 45 pages generated, including `/contact`, `/admin/contact`, and both contact APIs. The only warning was the existing 15-month-old Browserslist database notice.
- SQL: not run. Exact local blocker: `supabase command not found`; `psql command not found`; `pg_isready command not found`; Docker client is present, but `docker info` reports `Cannot connect to the Docker daemon at unix:///Users/al1234/.docker/run/docker.sock. Is the docker daemon running?` No hosted Supabase changes were attempted.

## Review fixes

- Removed the default from the four-argument limiter implementation so the exact three- and four-argument RPC signatures are unambiguous to PostgREST. pgTAP now checks both signatures, confirms the timestamped function has no defaults, verifies service-role EXECUTE grants, and executes the three-argument form.
- Replaced parseable-date cursor validation with delimiter-safe `z.iso.datetime({ offset: true })` syntax, and added rejection coverage for RFC/comma dates plus offset acceptance. Repository query tests verify bounded `limit + 1`, status filtering, and the exact safe keyset `.or` predicate.
- Added a server-only Vercel request-identity helper. It accepts only a validated `x-vercel-forwarded-for` address when `VERCEL=1`, ignores browser-controlled `x-forwarded-for`/`x-real-ip`, and collapses missing, chained, malformed, or overlong values to `unknown-client` before HMAC bucketing.
- Removed the production process-local limiter map and updated the legacy unit tests to cover normalization/HMAC behavior instead.
- Review validation: focused suites — 4 files / 19 tests passed; `npm run check` — 38 files / 203 tests passed; `npm run build` — 45 pages generated. SQL remains unverified for the exact local-tooling blocker above.

## Concerns / follow-up boundaries

- Task 4 should reuse `public.chat_rate_limit_buckets` and `public.consume_chat_rate_limit` with a separate scope; no competing rate-limit store was added.
- Live visitor chat behavior remains intentionally deferred to Task 5.

## Commit

Commit: `feat: add durable contact inbox and rate limiting` (the exact SHA is recorded in the task handoff).
