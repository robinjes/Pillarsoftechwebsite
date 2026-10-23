# Live Q&A (`/qna`)

A Slido-style audience Q&A for in-person events. The audience page is
**unlisted**: nothing on the public site links to it, it is not in the sitemap,
and it sends `noindex`. People reach it by QR code or by typing
`pillarsoftech.org/qna`. Unlisted is not private — anyone with the link can
open it — so all host controls require staff sign-in.

## Pages

| URL | Who | What |
| --- | --- | --- |
| `/qna` | Audience (no sign-in) | Ask a question (name optional), upvote, sort Popular / Recent / Answered. Refreshes every few seconds. |
| `/admin/qna` | Staff | Create a session and put it live, close or reopen questions, highlight, mark answered, hide. Shows and downloads the QR code. |
| Presenter screen | Staff | Button on `/admin/qna`. Full-screen view of the highlighted question plus the QR code. Esc to exit. |

## One-time setup

1. In the Supabase dashboard, open **SQL Editor**, paste
   `supabase/migrations/202610230001_qna.sql`, and run it.
   (Or `supabase db push` if the CLI is linked to the project.)
2. Make sure `SUPABASE_SERVICE_ROLE_KEY` and `CHAT_TOKEN_PEPPER` are set in
   the hosting environment. The contact form already needs both, so they
   should be there.

No Realtime setup is needed: the audience page polls `/api/qna`, which is
cached at the edge for two seconds so a full room causes about one database
read every two seconds.

## Event-day checklist

1. Sign in at `/admin/login`, open **Q&A**, create a session (for example
   "Career Panel 2026"). It goes live on `/qna` immediately.
2. Download the QR PNG for slides or printed table cards.
3. On the projector laptop, open **Presenter screen**.
4. During the panel: **Highlight** the question being answered, then
   **Mark answered**. **Hide** anything inappropriate.
5. Afterwards, **Close questions** or **Take off /qna**.

## Abuse limits

- Per device: 6 questions per 5 minutes, 60 votes per minute.
- Per network: generous limits, because a venue usually shares one Wi-Fi
  address.
- One vote per device per question (enforced in the database).
