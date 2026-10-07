# Security release runbook

This runbook is a staging-first handoff for the validated content, registration, volunteer, and media security migrations. Commands that target a hosted project are operator instructions only; the application never runs them automatically. See `admin-volunteer-recovery.md` for the latest authorized recovery evidence. Replace every angle-bracket placeholder with an owner-approved value and never commit the replacement values.

## 0. Read-only deployment context

The provided organization inventory on 2026-08-18 showed:

- Production candidate: Pillars of Tech Volunteer Database, project ref egpkdqvgivnvzzfgpfix, free plan.
- The main production branch reported Healthy, while the dashboard showed No migrations and No backups.
- No GitHub repository connection was visible.
- No separate staging project was visible.
- Supabase Advisor reported no current security or performance findings. That dashboard result does not validate this application's authorization paths, migration contents, photo permissions, or release approval.

Treat egpkdqvgivnvzzfgpfix as a production candidate, not as staging. Before any hosted migration, the owner must create and approve a separate staging project and ref, for example <STAGING_PROJECT_REF>. This inventory is historical; use `admin-volunteer-recovery.md` for later observations. Provider-supported manual CLI schema/data exports are acceptable backup evidence when an isolated restore verifies their contents; paid PITR is not required for that procedure.

## 1. Release inputs and backup gate

The owner/operator must provide and record out of band:

1. A separately created staging project ref and canonical staging HTTPS origin.
2. The production candidate approval, canonical production HTTPS origin, and the exact preview deployment.
3. A provider-supported schema snapshot and data backup/PITR restore marker for staging before its migration.
4. A fresh schema snapshot and data backup/PITR restore marker for the production candidate immediately before its migration. Record the provider artifact/marker and restore procedure, not only a ticket number.
5. The auth UUIDs for any initial staff grant, verified by the owner out of band. Do not put identities in this repository, migrations, fixtures used for deployment, or client requests.
6. A reviewed content import and the release/rollback ticket.

Required owner-managed environment names are already present in .env.example:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server-only)
- CHAT_TOKEN_PEPPER (server-only HMAC secret for contact/chat identity and visitor ownership)
- NEXT_PUBLIC_SITE_URL (canonical HTTPS origin, without a path)
- NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME (optional approved image delivery)

Never copy values from local env files into the repository, a report, or a command transcript. The service-role key must never enter browser code.

The visitor-chat cookie is always Secure, HttpOnly, SameSite=Lax, and scoped to `/api/chat`. It contains only a fresh opaque token; server storage keeps only its HMAC-SHA256 digest keyed by `CHAT_TOKEN_PEPPER`. Do not log or export the token, visitor name/email, or message body. Invalid, foreign, and expired ownership must remain fail-closed.

## 2. Google OAuth and canonical callback configuration

Keep the application origin and provider callback roles distinct:

1. Set Supabase Auth URL Configuration Site URL to the approved canonical application origin, and add only approved application redirect URLs:
   - https://<PRODUCTION_ORIGIN>/auth/callback
   - https://<STAGING_ORIGIN>/auth/callback
   - an explicitly approved local origin only when developing locally.
2. Set NEXT_PUBLIC_SITE_URL to the matching production or staging application origin, without a path. The callback route uses this trusted value and does not accept a request Host as canonical.
3. In each Supabase project's Google provider configuration, verify the provider callback URI for that project:
   - https://<STAGING_PROJECT_REF>.supabase.co/auth/v1/callback
   - https://egpkdqvgivnvzzfgpfix.supabase.co/auth/v1/callback for the production candidate, only after the owner confirms the ref.
4. In the Google OAuth client, register those Supabase provider callback URIs exactly. The application /auth/callback URLs belong in Supabase Auth's redirect allowlist; do not substitute one class of URI for the other.
5. Complete one staging sign-in and sign-out smoke test with an owner-approved Google identity. Confirm an unlisted identity cannot access staff routes and that no shared password is offered.

Keep Google credentials, client secrets, and staff identities out of this repository. Record verified hosted outcomes without exposing their values.

## 3. Local migration and pgTAP validation

The pinned CLI syntax was checked locally with npx --yes supabase@2.114.0 ... --help on 2026-08-18. db push --help exposes --dry-run, --project-ref, --linked, and --db-url; test db --help exposes --local, --linked, and --project-ref. The following local commands do not contact hosted Supabase:

```sh
npm ci
npx --yes supabase@2.114.0 start
trap 'npx --yes supabase@2.114.0 stop' EXIT
npx --yes supabase@2.114.0 db reset --local
npx --yes supabase@2.114.0 test db --local
```

db reset --local applies every checked-in migration to a fresh local database. test db --local runs all checked-in pgTAP files under supabase/tests. Keep Docker running for this gate. If the local database is unavailable, record the exact error rather than treating a skipped database gate as passed.

Run the repository gates before staging approval:

```sh
npm run check
npm run build
npm audit --audit-level=low
node scripts/check-workflows.mjs
ruby -e 'require "yaml"; Dir[".github/workflows/*.{yml,yaml}"].sort.each { |path| YAML.load_file(path) }'
git diff --check
```

## 4. Staging migration and policy gate

Only after the owner has created the separate staging project and recorded its schema/data backup evidence:

1. Review the checked-in migration order and generated content import. Do not seed staff identities or publish content as part of migration.
2. Preview the remote migration without applying it:

```sh
npx --yes supabase@2.114.0 db push --dry-run --project-ref <STAGING_PROJECT_REF>
```

3. Have the authorized operator review the dry-run output against the backup marker and migration list. The dry run is a hosted read/check and must be run only by that operator.
4. Apply the reviewed migrations to staging:

```sh
npx --yes supabase@2.114.0 db push --project-ref <STAGING_PROJECT_REF>
npx --yes supabase@2.114.0 test db --project-ref <STAGING_PROJECT_REF>
```

5. Confirm all pgTAP files pass on staging. If the provider requires a database password or connection URL, supply it through the CLI prompt or an owner-managed secret channel; never put it in this repository.
6. If staging migration fails, stop. Restore from the provider-approved schema/data backup or PITR marker according to the provider procedure; do not hand-edit migration history.

The policy suite covers public projections, unpublished/approved boundaries, atomic participant capacity, service-role repository privileges, staff-only functions, media storage, forms, and volunteer/profile hardening. A green local suite does not establish that the remote candidate is authorized for production.

### 4.1 Legacy volunteer data repair gate

The forward migration `202609070001_legacy_release_backfill.sql` is the
upgrade path for a project that already used the original `profiles.role`,
`event_volunteers`, `check_in_sessions`, `attendance_logs`, and
`volunteer_hour_adjustments` tables. The foundation migration leaves the
legacy role column and source tables in place. Staff authority is copied only
when `profiles.id` is an existing `auth.users.id`; the migration never reads
or authorizes by email, provider metadata, or a client claim.

The migration copies valid registration and attendance rows into the
versioned tables while preserving UUIDs, statuses, hours, check-in/out times,
and created timestamps. It does not delete or rewrite a legacy row. A missing
or conflicting event identifier is left in the legacy source and recorded as
unresolved; the migration never synthesizes an event mapping. Import or map
the event in staging through the separate owner-reviewed content operation,
then rerun the private backfill. Imported events remain unpublished until
approval, and existing configured event rows are never replaced.

Before enabling the new volunteer flow, the authorized database operator must
run the read-only reconciliation queries below on staging and the production
candidate, using the provider backup marker from Section 1:

```sql
select source_table, issue_code, count(*)
from public.release_migration_issues
where resolved_at is null
group by source_table, issue_code
order by source_table, issue_code;

select count(*) as legacy_registration_rows from public.event_volunteers;
select count(*) as versioned_registration_rows from public.volunteer_registrations;
select count(*) as legacy_session_rows from public.check_in_sessions;
select count(*) as versioned_session_rows from public.attendance_sessions;
select count(*) as legacy_log_rows from public.attendance_logs;
select count(*) as migrated_staff_rows from public.staff_members;
```

Any row in `release_migration_issues` is a release blocker. Resolve its exact
owner-approved mapping out of band, verify the source row and destination on
staging, and rerun the private owner function:

```sql
select public.run_release_legacy_backfill();
```

The function has no browser or service-role execution grant. Do not drop
`profiles.role` or any legacy source table until row counts, sampled volunteer
history, active check-ins, staff UUID memberships, and rollback evidence have
been verified. If an issue remains unresolved, stop and restore or continue
serving the legacy application according to the provider rollback procedure.

## 5. Owner-only staff allowlist grant

After staging migration and before staff smoke tests, the database owner or explicitly authorized database operator may run reviewed SQL using owner-provided, out-of-band-verified UUIDs:

```sql
insert into public.staff_members (user_id, created_by, updated_by)
values ('<VERIFIED_AUTH_USER_UUID>', '<DATABASE_OWNER_UUID>', '<DATABASE_OWNER_UUID>');
```

Verify the row and approval in the release ticket. Ordinary authenticated clients, email substrings, seed files, and this repository must never grant staff access. Do not add a staff identity to a migration or commit.

## 6. Content import and staging smoke tests

Generate the import as review-only SQL, inspect it, and apply it only through the approved staging operator workflow after the backup gate:

```sh
node scripts/import-content.mjs > <REVIEWED_IMPORT_SQL_PATH>
```

Remove unapproved rows/resources before an operator applies the file. Keep imported events unpublished until separately approved. Do not seed impact totals, finance figures, partnership/outcome claims, destination fields, webhook URLs, or script URLs.

The public events API treats a successful database read as authoritative,
including a deliberately empty published result. It uses the checked-in event
snapshot only when the public database client/read is unavailable, and an
empty snapshot produces a generic 503 rather than silently rendering an empty
event experience. This keeps an outage fallback useful without replacing
configured publication state with guessed content.

The one-off `supabase/operator-updates/20261005_event-volunteer-content.sql`
file is a separate content operation, not a migration or automatic importer.
It refuses a missing/incompatible event schema or volunteer registration RPC,
leaves the new STEM event unpublished for a separate owner-approved publish,
and preserves existing capacities, participant state, outcomes, media, and
audit actor fields on conflict. Use it after the reviewed staging content import and
only after the staging and backup gates in Sections 1, 4, 6, and 7; the same fresh
schema/data backup gate applies before any production content update.

Run these staging smoke checks and record exact responses:

1. Anonymous GET /api/events, GET /api/forms?eventId=<PUBLISHED_EVENT_ID>, and GET /api/impact expose only safe published/approved projections.
2. Anonymous admin mutations return 401; verified non-staff requests return 403; missing server configuration returns 503.
3. Submit one staged participant registration and one contact submission. Verify persistence is private and no external destination is called.
4. Export one staff-only participant CSV. Inspect quoting, newlines, and formula-prefix neutralization; remove the temporary export through the approved process.
5. Confirm UI and APIs do not expose audit fields, capacities, registration rows, destination fields, or legacy settings.
6. For media, use only an owner-approved non-sensitive test asset. Confirm incoming and private-document objects are not browser-readable, sign/finalize requires staff authorization, and /api/media/<id> serves only explicitly finalized public media. Never make an incoming object public to complete a smoke test.
7. Test Google sign-in, canonical callback handling, same-origin sign-out, staff allowlist enforcement, and an unlisted-account denial.

## 7. Production-candidate preview and approval

Use this order; do not skip directly from local checks to the candidate project:

1. Complete the local npm, workflow, build, audit, and local reset/pgTAP gates.
2. Create a preview deployment using the staging environment and run the staging smoke checks.
3. Keep content unpublished; review event stories, registration forms, approved metrics, media URLs, and staff boundaries.
4. Obtain owner approval naming the exact preview, staging ref, migration list, staff UUIDs, OAuth origins, and rollback marker.
5. Immediately before a candidate migration, create and verify the candidate schema/data backup restore marker or PITR marker.
6. Preview the candidate migration:

```sh
npx --yes supabase@2.114.0 db push --dry-run --project-ref egpkdqvgivnvzzfgpfix
```

7. After the owner records approval, the authorized operator may apply and test the candidate migration:

```sh
npx --yes supabase@2.114.0 db push --project-ref egpkdqvgivnvzzfgpfix
npx --yes supabase@2.114.0 test db --project-ref egpkdqvgivnvzzfgpfix
```

8. Re-run the anonymous/staff/media/OAuth smoke checks against the candidate. Publish events and enable registration forms only as separate, reviewed actions after smoke checks pass.

These hosted commands are documented for the release operator only. Record each actual result in `admin-volunteer-recovery.md`; a command example alone is not evidence that it ran.

## 8. Rollback

1. Unpublish affected events and forms through the staff API; disable participant registration first.
2. Stop content import/publish actions and record the incident/change ticket.
3. If schema or data rollback is required, use the provider's verified schema backup/data backup/PITR restore procedure. Do not hand-edit migration history or invent a down migration.
4. Restore the last approved preview only after the restored database passes the full local/remote policy tests and smoke checks.
5. Verify private participant/contact rows, staff membership boundaries, media visibility, OAuth callback behavior, and sign-out before reopening forms.
6. Rotate or revoke any credentials exposed during the incident and record the timestamp.

## 9. Credential retirement and owner controls

The removed shared admin password is permanently retired and non-reusable. Do not reintroduce it or add any alternate password path. Staff access uses owner-approved Google/Supabase identities plus explicit staff_members rows.

The repository owner must separately verify and enable, where appropriate, Dependabot alerts, secret scanning with push protection, and CodeQL availability. Green local checks, a hosted workflow, or this runbook do not establish that those owner settings are enabled. Record their actual state in the release ticket.

## 10. Website, branch, metadata, and deferred chat release gates

Task 6 adds authoritative `ca`/`ga` event branches, a dedicated typed branch-document table, and public discovery surfaces. The following owner gates are required before any hosted release:

1. Apply the event/branch migrations to a separately approved staging project first, after recording its schema/data backup marker. Confirm the event `branch` default/check/index and the branch-document RLS/column grants with the local and staging pgTAP suites.
2. Keep both seeded branch packets empty and unpublished unless the owner has supplied source-approved content. A Georgia packet may become public only when the server-side contract has a service area, leaders/roles, programs, contact route, associated event IDs, CTA, approved real photos with non-empty alt text, `safe_for_public`, `published`, and explicit approval evidence/time. Do not infer a branch from event title, location, or copy.
3. In the preview, verify that `/ga` returns a 404 while the packet is missing, incomplete, unpublished, or unapproved. Confirm its draft fields do not appear in HTML, metadata, client responses, `sitemap.xml`, robots output, or structured data. After an owner-approved packet is staged, verify the page, event links, canonical metadata, and only public Organization/Event JSON-LD with `<` escaping. Do not publish Georgia from this repository or migration.
4. Review the canonical origin, public cache policy, private `no-store` responses, and CSP nonce on both Organization and Event JSON-LD. `robots.txt` is defense-in-depth only; it does not replace authorization or the server-side publication predicate.

The current owner-managed environment names are listed in `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CHAT_TOKEN_PEPPER`, `NEXT_PUBLIC_SITE_URL`, and the optional `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`. Public values still require owner-controlled origin/repository configuration; the service-role key and pepper are server-only. If the deferred Discord bridge is later approved, add its server-only application/bot/signature, guild, private-channel, allowed-role, and retention-job credentials through the platform secret store only; do not guess names, commit values, or treat a Discord role as application staff authorization.

### Deferred Discord setup and synthetic acceptance

Discord work is intentionally deferred from this website tranche. Before enabling it in a later, separately reviewed change:

1. Create a separate staging Discord application and private test guild. Configure the preview interaction endpoint and verify the application ID/public key, bot token, guild ID, parent channel ID, and allowed role ID out of band. Store each value in the platform secret manager, never in source, logs, fixtures, or client code.
2. Create one private `#website-live-chat` parent channel and restrict it to the mapped staff role. Provision one thread per synthetic website conversation; do not use visitor email, names, or real transcripts during acceptance.
3. Add only owner-approved staff mappings linked to existing `staff_members.user_id` rows. Verify signature, application, guild, parent channel/thread, role, and active mapping checks independently; a Discord role or username never grants website staff access.
4. Run a synthetic preview flow: website message → private Discord thread → mapped staff modal reply → website display, plus close/spam/retry and queue-open/close cases. Confirm failed delivery remains retryable, no sensitive values are logged, and the protected email contact path still works.
5. Schedule the protected daily retention job only after preview approval. It may delete resolved/spam conversations and their messages after 30 days; it must not delete open conversations solely because they are old. Record the scheduler, secret/authorization method, cutoff result, and last successful run in the release ticket.

### Independent chat rollback

If chat or its Discord bridge is unhealthy, close the queue and disable the public chat launcher through the approved protected control. Keep the protected email form and the visible `pillarsoftech@gmail.com` fallback available. Do not remove staff authorization, registration, volunteer, donation, media, branch, or event behavior as part of a chat rollback. Record the queue-close/launcher-disable timestamps, preserve unresolved conversations for review, and re-run the synthetic email and website acceptance checks before reopening chat.
