# Admin and volunteer deployment recovery

## Current observed state

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

## Owner recovery order

Use [`security-release-runbook.md`](security-release-runbook.md) as the
operator procedure. Its sections 1–7 cover approvals and backups, OAuth
configuration, local migration checks, staging, the legacy data repair, UUID
staff grants, content import, and production-candidate release. In particular:

1. Create and approve a separate staging project. Record provider-supported
   schema and data backup/restore evidence for staging and for the production
   candidate before applying migrations. Do not use the current production
   project as staging. Follow runbook sections 1 and 4.
2. Apply the complete checked-in migration chain in filename order to a fresh
   local database, then staging. The foundation migration
   `202608180001_security_foundation.sql` creates `events` and
   `staff_members`; the forward migration
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
