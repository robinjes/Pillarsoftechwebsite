# Security release runbook

This runbook is a review checklist for deploying the validated content and registration APIs. The commands below are placeholders only; replace every `<PLACEHOLDER>` with an owner-approved value during the release. No command in this document claims to have been executed.

## 1. Backup and change review

1. Confirm the release commit and migration list with the repository owner.
2. Take a provider-supported backup or point-in-time restore marker for `<STAGING_DATABASE>` and, before production, `<PRODUCTION_DATABASE>`.
3. Review the generated event import from `node scripts/import-content.mjs`; remove any unapproved row or resource before applying it.
4. Confirm that no forms contain a destination, webhook, script URL, or external delivery instruction; do not seed impact totals, finance figures, or outcome claims.

## 2. Staging migration and policy tests

```sh
supabase link --project-ref <STAGING_PROJECT_REF>
supabase db push --linked
supabase test db --linked
```

Use the provider backup/restore workflow if a staging migration must be reversed. Do not use the linked commands against production during this step.

## 3. Initial staff grant

Only the database owner or an explicitly authorized database operator may grant a staff membership. Verify the identity out of band first, then use a reviewed SQL session against staging:

```sql
insert into public.staff_members (user_id, created_by, updated_by)
values ('<VERIFIED_AUTH_USER_UUID>', '<DATABASE_OWNER_UUID>', '<DATABASE_OWNER_UUID>');
```

Never add a staff identity from a client request, email substring, seed file, or this repository's migration. Record the approval in the release ticket.

## 4. Content import review

```sh
node scripts/import-content.mjs > <REVIEWED_IMPORT_SQL_PATH>
psql "<STAGING_DATABASE_URL>" --file <REVIEWED_IMPORT_SQL_PATH>
```

After import, review event descriptions, safe local/media URLs, date/time labels, registration state, and unpublished state in the admin UI. Create forms manually through `/api/admin/forms` only after their field IDs/types/options and consent requirements are reviewed. Do not approve an impact metric without `sourceUrl`, `methodologyNote`, and `asOf`.

## 5. Staging smoke checks

1. Confirm anonymous `GET /api/events`, `GET /api/forms?eventId=<PUBLISHED_EVENT_ID>`, and `GET /api/impact` return only published/approved projections.
2. Confirm anonymous admin mutations return `401`, verified non-staff returns `403`, and unavailable server configuration returns `503`.
3. Submit one staged participant registration and one contact submission; verify rows exist only in private tables and no external destination is called.
4. Export one staff-only participant CSV; inspect formula-prefixed values, quotes, and newlines before deleting the temporary copy.
5. Confirm the UI does not expose audit fields, capacities, registration rows, destination fields, or legacy settings.

## 6. Production migration and release

```sh
supabase link --project-ref <PRODUCTION_PROJECT_REF>
supabase db push --linked
```

Run the same policy tests and smoke checks against production with owner-approved service credentials. Import reviewed event content only after the production backup marker is recorded. Publish content and enable registration forms as separate reviewed actions.

## 7. Rollback

1. Unpublish affected events/forms through the staff API.
2. Disable participant forms and record the incident/change ticket.
3. If schema rollback is required, use the provider's restore/PITR procedure from the backup marker; do not hand-edit migration history.
4. Re-run policy tests and smoke checks after restore, then verify private registration/contact rows and staff membership boundaries.

## 8. Secret retirement

After the production smoke window, revoke and rotate any retired Apps Script/EmailJS credentials or delivery integrations at the provider. Remove old browser/client secrets from deployment configuration, verify no build artifact contains them, and record the revocation timestamp. Optional mail delivery may be added later only as a server-side, reviewed integration; persistence must not claim delivery.
