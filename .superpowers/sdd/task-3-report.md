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

## Concerns / follow-up boundaries

- The legacy exported in-memory `allowContactAttempt` helper remains only for the pre-existing unit tests/backward imports; the production `/api/contact` route uses `allowContactAttemptDurably` and never calls the map.
- Task 4 should reuse `public.chat_rate_limit_buckets` and `public.consume_chat_rate_limit` with a separate scope; no competing rate-limit store was added.
- Live visitor chat behavior remains intentionally deferred to Task 5.

## Commit

Commit: `feat: add durable contact inbox and rate limiting` (the exact SHA is recorded in the task handoff).
