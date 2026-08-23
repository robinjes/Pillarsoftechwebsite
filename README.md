This is the website code for the Pillars of Tech website.
Its domain is on porkbun and run through vercel.

## Local verification

Use Node.js 24.15 or newer with npm 11 or newer. The test stack relies on web-platform APIs that are not available in Node 20. Install the locked dependency set before running checks:

```sh
npm ci
npm run check
npm run build
npm audit --audit-level=low
node scripts/check-workflows.mjs
ruby -e 'require "yaml"; Dir[".github/workflows/*.{yml,yaml}"].sort.each { |path| YAML.load_file(path) }'
```

`npm run check` runs linting, typechecking, and the test suite together. The workflow guard requires every third-party Action to use a full immutable SHA and checks that CI contains the pinned local Supabase policy job.

For a fresh local database, Docker must be running. The CLI version is intentionally pinned rather than added as a runtime dependency:

```sh
npx --yes supabase@2.114.0 start
trap 'npx --yes supabase@2.114.0 stop' EXIT
npx --yes supabase@2.114.0 db reset
npx --yes supabase@2.114.0 test db
```

`db reset` applies every checked-in migration to a fresh local database, and `test db` runs every file under `supabase/tests`. Use `npm run dev` for local development and `npm start` to serve a completed production build.

## Required configuration

The server and browser require these owner-managed environment variables. Never commit their values, copy local env files into a report, or use a service-role key in browser code:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
```

`NEXT_PUBLIC_SITE_URL` must be the canonical HTTPS origin (for example, `https://www.example.org`) with no path. In Supabase Auth, configure Google OAuth only through the provider settings and register the exact canonical and approved staging callback URLs (`https://<origin>/auth/callback`) in both the Google client and Supabase Auth URL settings. Keep local development callbacks explicitly limited to the local origin. The owner must supply provider credentials and decide which staging/production origins are approved; this repository does not contain them.

## Release and database boundaries

Before any staging or production migration, the owner/operator records a provider-supported backup or point-in-time restore marker. This branch performs no remote migration, does not link to a hosted project, and does not add staff identities. Preview validation comes first: run the local gates, deploy a preview, smoke-test anonymous public APIs and private staff flows, review staged content as unpublished, and only then apply an owner-approved remote migration and publish reviewed content. Roll back by unpublishing events and disabling forms first; use the provider restore/PITR process for schema rollback, then rerun policy tests and smoke checks.

Staff access is granted only in a reviewed SQL session by an authorized database owner/operator, using UUIDs supplied and verified by the repository owner out of band:

```sql
insert into public.staff_members (user_id, created_by, updated_by)
values ('<VERIFIED_AUTH_USER_UUID>', '<DATABASE_OWNER_UUID>', '<DATABASE_OWNER_UUID>');
```

The old shared admin password is retired, must not be reused, and must not be reintroduced. Use verified Supabase identities and explicit `staff_members` rows instead. Do not place owner-provided identities in migrations, fixtures used for deployment, or client requests.

For media smoke tests, use an owner-approved non-sensitive test asset: verify incoming and private-document objects are not browser-readable, verify staff-only sign/finalize behavior, and verify only an explicitly finalized public asset is delivered through `/api/media/:id`. Do not test by granting public access to an incoming object or by committing a real asset/credential.

The remaining GitHub owner settings still require explicit owner action and verification: Dependabot alerts, secret scanning and push protection, and CodeQL availability for the repository. This branch does not claim those settings are enabled.

See [`docs/security-release-runbook.md`](docs/security-release-runbook.md) for the full staged release checklist.
