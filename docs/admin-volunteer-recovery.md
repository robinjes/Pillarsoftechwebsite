# Admin and volunteer deployment recovery

## Current observed state (2026-10-06)

The latest production check found only the legacy tables `attendance_logs`,
`check_in_sessions`, `event_volunteers`, `hour_adjustments`, `profiles`, and
`volunteer_hour_adjustments`. The public `events` REST resource returned
`PGRST205` (table not found), and `staff_members` was absent. This is an
incomplete deployment: Google sign-in may complete, but the site cannot verify
staff access or serve the new event-backed volunteer flow. No production fix
is claimed here.

The protected admin layout verifies the signed-in user with Supabase Auth and
checks that user's Auth UUID in `staff_members`. If the membership lookup is
unavailable, it keeps staff tools closed and tells the user that an owner must
finish or repair workspace access. A missing Supabase server configuration is
reported separately. Do not treat a successful Google sign-in as staff
authorization.

The Google provider is enabled, and the observed apex callback forwards to the
canonical `www` origin with a `307` before code exchange. Keep the existing
OAuth bridge; the observed blocker is the database deployment.

The existing separate **Pillars of Tech Staging** project has been resumed.
Provider-supported CLI schema/data exports for staging and production have
passed isolated PostgreSQL 17 restore checks, including source row-count
reconciliation. Private exports, identities, credentials, and restore-marker
paths are held out of band; they are not release artifacts in this repository.

A dedicated staging website is deployed at
`https://pillarsoftech-staging.vercel.app`. It uses staging Supabase credentials,
a server-only service role and chat pepper, and the matching canonical site URL.
The Supabase staging Site URL and exact application callback allowlist entry
have been saved. The production website and production database have not been
promoted or migrated by this recovery.

Staging Google sign-in currently fails with `redirect_uri_mismatch`. The existing
Google provider is enabled, but its Google OAuth client must allow
`https://axofzbojdudjlfuehccd.supabase.co/auth/v1/callback`. The available Google
Cloud account does not own that client. This provider callback is distinct from
the application's `/auth/callback` URL. Complete a real sign-in/sign-out and
staff/unlisted-account smoke check after the client owner adds the URI.

The migration recovery qualifies the existing `extensions.gen_random_bytes`
function so it works under the hosted operator's restricted search path. It
also accepts the real legacy `event_volunteers` shape without `checked_in_at`,
preserving a supplied timestamp and using NULL when the source has none. Neither
fix removes legacy data or fabricates a check-in time.

The nine development dependency audit findings have been cleared by upgrading
to Tailwind 4 and replacing the vulnerable Next ESLint glob dependency with a
scoped, behavior-tested implementation. `npm audit --audit-level=low` reports
zero findings. Tailwind 4 requires Safari 16.4+, Chrome 111+, or Firefox 128+.

## Owner recovery order

Use [`security-release-runbook.md`](security-release-runbook.md) as the
operator procedure. Its sections 1–7 cover approvals and backups, OAuth
configuration, local migration checks, staging, the legacy data repair, UUID
staff grants, content import, and production-candidate release. In particular:

1. Reuse the separate staging project recorded above. Record provider-supported
   schema and data backup/restore evidence for staging and for the production
   candidate before applying migrations. Do not use the current production
   project as staging. Follow runbook sections 1 and 4.
2. Apply the complete checked-in migration chain in filename order to a fresh
   local database, then staging. The foundation migration
   `202608180001_security_foundation.sql` creates `staff_members`, and
   `202608180002_content_registration.sql` adds the event content schema. The forward migration
   `202609070001_legacy_release_backfill.sql` reconciles legacy volunteer and
   staff data. Run every intervening migration and the local pgTAP checks as
   specified in sections 3–4. Do not hand-edit migration history.
3. Generate the content import with `node scripts/import-content.mjs`, review
   the generated SQL and apply it only through the approved staging workflow.
   Keep imported events unpublished unless they separately pass the publication
   review. This is part of runbook section 6.
4. On staging, resolve owner-reviewed event ID mappings before rerunning the
   private legacy backfill function. Run the section 4.1 reconciliation
   queries for unresolved `release_migration_issues` and legacy/versioned row
   counts. Any unresolved issue blocks release; preserve legacy rows until
   sampled history, active check-ins, UUID staff memberships, and rollback
   evidence reconcile.
5. Reconcile the staff memberships copied by the legacy backfill before
   considering a new grant. It preserves existing staff/admin profiles only
   when their UUID matches an existing Auth user; the application still checks
   `staff_members`. If a new grant is needed, first independently verify the
   owner-approved Google user's existing `auth.users.id`, then use the
   owner-only insert in section 5. Keep the UUID and identity out of this
   repository. Never authorize application access from `profiles.role`, email,
   provider metadata, or a client-supplied value.
6. Complete the staging smoke checks in sections 4–6, including anonymous
   denial, verified staff access, unlisted-account denial, event reads, private
   data, and sign-out. Confirm PostgREST recognizes `events` and the server can
   query the caller's `staff_members` row. Then follow section 7's production
   approval, fresh backup, dry-run, authorized migration, and post-release
   checks before changing production.

Until those gates pass, a missing `events` resource or unavailable
`staff_members` lookup remains a deployment blocker. A code change or successful
OAuth redirect alone does not establish that production is repaired.
