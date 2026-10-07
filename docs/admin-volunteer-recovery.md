# Admin and volunteer deployment recovery

## Verified database recovery checkpoint (2026-10-06, US Eastern)

Production now contains `events`, `staff_members`, and the versioned volunteer
and attendance tables. All 16 migrations have been applied through the
authorized operator workflow. The legacy backfill restored existing staff
memberships only for verified Auth UUIDs and copied the existing volunteer
registration. There are no unresolved migration issues. All six legacy public-data projections remain unchanged. The private staff
approval rows retain their identity, approval, active-status, and claim fields;
one `updated_at` value differs between the pre- and post-migration snapshots.
All seven projections match between the two post-migration checkpoints. No new production staff identity was granted.

A real production Career Panel volunteer signup persisted after a page reload,
and the temporary signup was cancelled successfully.

The live Google-authenticated ordinary account now receives the expected
`not-staff` response from `/admin`, instead of an unavailable-membership error.
The requested staff account's existing UUID membership is restored, but its
owner must still exercise that account's actual production session; another
person's login is not a substitute for that check.

At this pre-deployment checkpoint, production's existing nine-event archive
is serving successfully. The new STEM
publication, Career Panel Luma resource, and approved Stockmen's gallery must
be released together with the updated frontend: the older deployed content
validator rejects the newly approved Luma hostname. The new event remains
unpublished until that compatible frontend is live.
[PR #29](https://github.com/robinjes/Pillarsoftechwebsite/pull/29) records the
subsequent frontend deployment and content-publication result.

Production `/api/chat/availability` still returns 503. The public event read and
Google authentication work, so this is a separate server API problem. Missing
or mismatched `SUPABASE_SERVICE_ROLE_KEY` is one possible cause; without Vercel
settings or logs, it is not established as the exact cause. The available
Vercel account cannot access `pillarsoftechs-projects / pillarsoftechwebsite`,
and the requester confirmed they lack that access. A project owner must inspect
the production server configuration and logs, verify its Supabase service-role
key and `CHAT_TOKEN_PEPPER`, and redeploy if settings change. Keep all values in
the platform's secret storage. Admin writes, CSV, media, contact, and chat
production acceptance remain unverified until the server APIs are healthy.

## Backup and staging evidence

Provider-supported CLI exports were restored into isolated PostgreSQL 17
containers before hosted migration. The immediate pre-migration production
backup reconciled 40 exported relations and 88 rows. The final checkpoint after
the first 15 migrations reconciled 59 exported relations and 131 rows, including
application migration history. Both restores matched all seven legacy source
projections. Official exports exclude the provider's internal `auth.schema_migrations`
and `storage.migrations` metadata; that exclusion is recorded in the private
manifests. Private exports, identities, credentials, and restore-marker paths
stay out of this repository. Manual verified restore evidence is used; paid
PITR is not asserted.

The dedicated staging site is `https://pillarsoftech-staging.vercel.app`, backed
by the separate approved staging Supabase project. Its Google OAuth client and
canonical callback are configured. Real Google sign-in and sign-out passed,
as did the unlisted-account denial and the temporarily approved staff dashboard
check. Temporary staff access was removed afterward and the same authenticated
account was denied staff APIs again.

Staging HTTP and browser checks verified saved volunteer registrations after
reload, cancellation, private participant/contact persistence, capacity
limits, staff CSV quoting and formula-prefix neutralization, public image
finalization, private PDF delivery, and anonymous/nonstaff denials. Temporary
staff, disposable events, participant fixtures, media records, and storage
objects were removed; no active test volunteer registrations remain. These
staging results do not establish production server API health.

The first 15 migrations and 384 pgTAP assertions passed on a fresh local
PostgreSQL 17 install, staging and production-data backup clones, and hosted
staging. Hosted production exposed inherited explicit function execution
grants that older migrations had revoked only from `PUBLIC`. The narrowly
scoped forward migration `202610070001_function_execute_hardening.sql` removes
those direct API-role grants and restores the intended role for each of ten
application functions. It preserves unrelated functions and default ACLs;
the Auth profile trigger has no direct API-role execution grant. The additional
21 assertions cover the final role matrix and an unrelated-function sentinel.
The final migration has been applied to hosted staging and production. The
full 14-file suite passes 405 assertions on the restored staging copy, hosted
staging, and hosted production with verified TLS. A separate rollback regression recreated the broad grants, verified all
21 new assertions, and restored the original ACL snapshot; a rollback insertion
as `supabase_auth_admin` still created its profile. Four public-form test reads
are scoped to all three of their fixture IDs, retaining the unpublished/draft
denial checks while allowing existing hosted content.

## Frontend and dependency validation

The update adds STEM Into the Night on November 4, 2026, 4–5:30 PM Pacific at
Junction Avenue K-8, and opens its volunteer registration along with Career
Panel. Career Panel uses the owner's exact Luma checkout event ID and URL.
Four approved Stockmen's Park 2026 photos are attached to the separate 2026
archive; the 2025 record is preserved.

In-app browser checks covered desktop and a real 390×844 iframe viewport,
including event details, Luma ticket selection, outer-dialog keyboard dismissal
and focus restoration, and the four-image gallery. No Luma registration was
submitted. Luma controls keyboard behavior inside its cross-origin iframe.

The nine development dependency audit findings were resolved by the Tailwind 4
upgrade and a scoped, behavior-tested replacement for the vulnerable Next
ESLint glob dependency. Sharp is pinned to 0.35.5. Lint, typecheck, 299 application
tests, production build, workflow validation, and `npm audit --audit-level=low`
passed; the audit reports zero findings. Tailwind 4 requires Safari 16.4+,
Chrome 111+, or Firefox 128+.

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
