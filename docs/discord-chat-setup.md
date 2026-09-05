# Read-only Discord chat setup

This guide covers owner-controlled setup for the private website chat bridge. The
repository does not install a Discord application, change a guild, seed a staff
mapping, deploy a preview, or enable public chat. The setup command is a
read-only preflight; its output contains statuses and counts only.

## Prerequisites and owner approvals

Use Node.js >=24.15.0 and npm >=11, a separately approved staging Supabase
project, a separately approved staging Discord guild, and an HTTPS preview
deployment. Complete the migration backup/rollback gate in
[security-release-runbook.md](./security-release-runbook.md) before supplying
service credentials. Never copy local env values into source, reports, tickets,
or chat messages.

The owner/operator supplies these names through the local shell or platform
secret store. Values are never printed:

| Name | Purpose |
| --- | --- |
| CHAT_ENABLED | Public flag; keep false during setup. |
| DISCORD_APPLICATION_ID | Dedicated Discord application/bot snowflake. |
| DISCORD_PUBLIC_KEY | Ed25519 key for the signed interaction route. |
| DISCORD_BOT_TOKEN | Server-only bot credential. |
| DISCORD_GUILD_ID | Fixed staging/production guild. |
| DISCORD_CHAT_CHANNEL_ID | Fixed private GUILD_TEXT parent channel. |
| DISCORD_CHAT_STAFF_ROLE_IDS | Comma-separated approved responder role snowflakes. |
| NEXT_PUBLIC_SUPABASE_URL | Approved staging/production Supabase origin. |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Existing server prerequisite; never grants staff access. |
| SUPABASE_SERVICE_ROLE_KEY | Server-only mapping-read/RPC credential. |
| CHAT_TOKEN_PEPPER | Existing server-only visitor-token HMAC secret. |
| CRON_SECRET | Existing server-only retention bearer secret (at least 32 non-whitespace characters). |

CHAT_ENABLED may be unset or false while setup is inspected. Missing Discord,
Supabase, pepper, or retention configuration returns INCOMPLETE with only
missing environment names. Public readiness stays closed until the existing
Discord, service, pepper, retention, and feature-flag requirements pass.

## Run the read-only checker

From the repository root:

~~~sh
npm ci
npm run chat:setup-check
~~~

The checker makes bounded GET requests only to fixed Discord API v10 resources
and one read-only POST per active identity to
/rest/v1/rpc/lookup_chat_discord_staff_actor. It never uses Discord POST, PATCH,
PUT, or DELETE; it never writes Supabase, channels, roles, mappings, queue
state, messages, or transcripts. It checks application/bot identity,
guild/channel relation and type, private overwrites, bot permissions, responder
roles, specific members, and active mappings linked to existing database
staff. It never lists the guild member directory. Responses and permission
data are bounded; timeouts, malformed data, unavailable members, and lookup
failures are never reported as success.

The permission evaluator follows Discord's order: @everyone base, member role
union, @everyone overwrite, aggregated role deny then allow, and member deny
then allow. It uses BigInt bitfields. The parent must explicitly deny
@everyone VIEW_CHANNEL. A role VIEW_CHANNEL allow must be an approved
responder role or the dedicated bot's managed role. Direct member grants must
resolve to the bot or an approved active mapped staff member with an approved
role. Guild owners and Administrator holders bypass overwrites by design; the
output discloses that governance warning and never claims they are blocked.
The configured channel's own overwrites are authoritative; category inheritance
is not invented.

The bot needs VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY,
CREATE_PUBLIC_THREADS, SEND_MESSAGES_IN_THREADS, and MANAGE_THREADS. Mapped
staff need an approved role, active mapping, VIEW_CHANNEL,
READ_MESSAGE_HISTORY, and USE_APPLICATION_COMMANDS. Ordinary thread messages
are intentionally not forwarded; staff replies use the signed interaction
route and website storage.

Tests use mocked destinations only:

~~~sh
npm test -- --run tests/chat-discord-setup.test.ts
npm run lint
npm run typecheck
~~~

## Dedicated Discord application

Create a separate application and bot. Install it into the approved staging
guild with OAuth2 scopes bot and applications.commands. Grant only the
reviewed bot permissions above on the private parent and its threads; do not
grant Administrator as a shortcut. Keep the parent inaccessible to @everyone,
then add only approved responder role(s) and the bot managed role. Do not
create a public invite or expose visitor identities.

The signed interaction URL is:

~~~text
https://<APPROVED_PREVIEW_ORIGIN>/api/integrations/discord/interactions
~~~

Configure the exact HTTPS preview host/path through the approved narrow
deployment-protection exception required for Discord; never disable protection
site-wide. The route independently validates the Ed25519 signature,
application, guild/channel/thread relation, role, and active mapping.

Register canonical command chat-queue with required type-1 subcommands open and
close:

~~~json
{
  "name": "chat-queue",
  "description": "Open or close the website chat queue",
  "type": 1,
  "options": [
    { "type": 1, "name": "open", "description": "Open the queue" },
    { "type": 1, "name": "close", "description": "Close the queue" }
  ]
}
~~~

Registration is an owner-operated external action; this repository and the
checker do not perform it. The queue is disabled by default and should be
opened only during Monday-Friday 16:00-22:00 America/Los_Angeles after
approval.

## Owner-run mapping

After verifying the existing staff_members row and exact Discord user ID out
of band, review and run [discord-staff-mapping.sql](./discord-staff-mapping.sql)
as the database owner/operator. The transaction checks staff_members.user_id,
inserts only the explicit numeric Discord ID, and never looks up by email,
profile metadata, username, or client request. It never creates staff
authority. Conflicts stop for review instead of silently reassigning an
identity. Multiple approved Discord IDs may map to one existing staff Auth
UUID; inactive rows never authorize replies.

The application service role has no broad staff_members read/write path. The
checker and interaction route use only service-only
lookup_chat_discord_staff_actor(text), which requires an active mapping and
existing staff membership. Do not add a PostgREST grant or second RPC.

## Retention, preview, rollback, and failures

Daily cleanup uses the existing protected CRON_SECRET route and Vercel cron
configuration. Vercel scheduled cron runs only on Production deployments;
preview acceptance must manually invoke the protected endpoint with the
owner-managed bearer secret against synthetic preview data. Do not claim a
preview schedule is installed or activate production from this repo. See
[Vercel cron troubleshooting](https://vercel.com/kb/guide/troubleshooting-vercel-cron-jobs)
and [Vercel cron jobs](https://vercel.com/docs/cron-jobs).

The queue starts closed. If bridge, endpoint, or delivery is unhealthy, close
the queue and keep public chat disabled while the protected email path remains
available. Preserve unresolved website messages; delivery failure is retryable
and remains pending/needs retry, never silently discarded. Ordinary thread
messages are not a second ingestion path. Do not delete open conversations
solely for age; retention deletes only old closed/spam data and keeps cleanup
retry records body-free.

Rollback requires owner approval: disable CHAT_ENABLED, close the queue, stop
new setup/registration changes, preserve unresolved conversations, and rerun
synthetic email/chat checks. Do not remove unrelated staff, registration,
volunteer, media, event, or content behavior. Rotate/revoke exposed credentials
through owner controls and record the release ticket.

## Hosted synthetic acceptance checklist

After migration, backup, deployment-protection, and owner approval gates for
the exact staging/preview pair:

1. Run the checker and retain sanitized statuses/counts.
2. Verify the preview interaction URL is reachable without weakening site-wide
   protection; send a signed Discord PING and confirm application ID.
3. With synthetic data only, submit one website message and verify one private
   parent thread, no email/name/transcript in logs, and no ordinary-thread
   forwarding.
4. Reply through the mapped Discord modal; exercise close, spam, queue
   open/close, duplicate interaction, timeout, and retry behavior.
5. Manually invoke preview retention with synthetic closed/spam data; verify
   old terminal data is eligible while open data is retained.
6. Verify an unmapped/nonstaff member is denied and an unapproved role/member
   grant makes setup fail; record Administrator/owner warnings.
7. Verify protected email still works; keep CHAT_ENABLED=false until the owner
   approves production.

Primary references: [Discord permissions](https://docs.discord.com/developers/topics/permissions),
[Discord OAuth2](https://docs.discord.com/developers/topics/oauth2),
[Discord application commands](https://docs.discord.com/developers/interactions/application-commands),
[Discord channels](https://docs.discord.com/developers/resources/channel),
[Supabase database functions](https://supabase.com/docs/guides/database/functions),
and [Vercel cron jobs](https://vercel.com/docs/cron-jobs).
