# Judging in OBS

## Local testing without Supabase

Run `npm run dev`, then open **http://localhost:3000/judging/demo** (use the port shown by Next.js if 3000 is occupied). No Supabase credentials, sign-in, migrations, or publishing are needed.

The demo uses the actual host, judge, scoreboard, and OBS view components with sample data held in dev-server memory. Use **Open demo judge** to change scores, choose a different student in the host tab, generate local OBS URLs, and lock scores to reveal final results. Paste the local URLs into OBS on the same computer to test your scene.

**Reset sample data** restores the original event. Restarting the dev server also clears changes. All demo pages and API operations return 404 in production; `/admin/judging` and the real judging APIs keep their existing authentication and database behavior.

## Using real event data

### Local judge backups and Wi-Fi interruptions

Open the judge page and sign in while connected before judging starts. Every score click and comment edit is saved immediately in browser storage, before the network save or comment debounce. The page keeps a cached roster and the judge's own scores so an already loaded judge screen can continue working when Wi-Fi drops. Pending edits take priority over older server scores and restore when the application loads again.

The **Score backup** panel identifies the judge/event, shows how many rubrics are waiting to sync, and provides **Download score backup**. That JSON file includes student names, scores, comments, save times, and whether each rubric is still waiting to sync. It remains available if the event ends or the session expires, so the host can recover unsent work manually. It is a recovery export, not an automatic admin import.

The page retries after reconnecting, on focus, and during polling. Queued writes include the expected judge and event; the server rejects a changed session. Saves for each student run in sequence, and older responses cannot clear newer edits. No unsent drafts are discarded when scores lock or a student is removed. The host must unlock scores or restore the event/student before normal synchronization can succeed. Sign-out preserves local drafts but removes the automatic offline-session pointer; signing in again as the same judge restores that judge's queue.

Backups belong to this browser profile and device. Demo and real-event backups are separate. Access codes and session cookies are never stored in the backup. Browser storage failures show an explicit warning; download a backup while keeping the page open in that case. Clearing browser data removes local copies.

Keep the judge tab open during an outage. Local score recovery does not install an offline copy of the website: a completely offline page reload may still fail to load the application itself. Host updates, timers changed by the host, and newly added students need connectivity. Local saves and syncing require no additional database migration.

### Parent QR and results release

Each current or expanded past event has a **Parent QR & results** section. Download the QR image for signage or copy the parent link. The page works on phones without sign-in and stays with that event after it ends.

Before release, families see the current presentation, next student, presentation number, total program size, and the host's editable awards announcement. They see **Scores coming after awards**. No scores, rankings, judge identities, codes, or comments are sent to their browser. Public score queries are skipped entirely while results are hidden.

After the awards presentation, lock scores and choose **Release all results to families**. Confirm the event to publish every student's average and rank together. Locking scores and ending an event do not release results automatically. The parent page checks for updates every four seconds. **Hide results from families** withdraws results on the next refresh; unlocking scores or reopening an ended event hides them automatically. Results already viewed cannot be recalled from attendees.

Use the parent QR for families; OBS links expose live scores and belong with staff. Parent pages are unlisted and marked noindex, but anyone with the parent link can see its event updates and, once released, final results. Missing scores appear as **No score**, and equal averages share a place.

This feature works in `/judging/demo` without Supabase. Live use requires the owner/operator to apply `supabase/migrations/202611160003_judging_audience.sql` after the existing judging and timer migrations, using the repository's backup and release process. No remote migration has been applied.

### Pitch and Q&A timer

The host can start a **2:00 pitch** or a **1:00 Q&A**, pause/resume, or reset from the current event. The countdown appears on judge screens and the OBS live judge view. Each phase starts manually; Q&A does not start automatically when the pitch ends.

Pitch colors follow the time cards: green initially, yellow at **1:00 elapsed**, red at **1:30 elapsed**, and **STOP at 2:00**. Q&A turns yellow with **0:30 remaining**, red with **0:10 remaining**, and shows STOP at zero. Text labels accompany colors. Time never goes negative; reaching STOP does not lock scores.

Selecting a different student, removing the current student, or ending the event clears the timer. The server stores a deadline so judges and OBS continue counting between polls and recover the same time after a refresh. Controls include the expected student to reject clicks from a stale host screen.

The local demo works immediately. Real events require the owner/operator to apply `supabase/migrations/202611160002_judging_timer.sql` using the repository's backup and release process before deploying this change. This migration has not been applied remotely.

### OBS setup

In **Admin → Judging**, open an event's **OBS broadcast** section and choose **Generate OBS links**. Past events also have this section when expanded.

Copy a view's URL into an OBS **Browser** source with Width **1920** and Height **1080**. The **Preview** link opens the same view in a new tab. See the [OBS Browser Source guide](https://obsproject.com/kb/Browser-Source).

- **Live judge screen:** follows the host's current student. Shows each judge's total after they complete all five categories, plus the average of completed rubrics. Partial rubrics display as waiting and do not lower the average.
- **Bottom score ticker:** scrolls the leaderboard along the bottom of an otherwise transparent canvas. Scores are provisional until locked.
- **Final results:** waits until the host locks scores, then shows standings. Equal averages share a rank; unscored students have no rank. More than eight students rotate through pages every ten seconds. Unlocking scores hides final standings again.

Views refresh every three seconds, including when captured by OBS. Ending an event preserves its links and scores. A failed refresh replaces stale scores with a reconnecting message; an expired or deleted-event link needs replacement.

Links expire after seven days. Anyone with a link can read that event's student names, projects, judge names, and scores. Links grant no editing access and exclude judge access codes, comments, and internal IDs. Generating fresh links does not revoke existing ones. The token is carried in the URL fragment and sent to the read-only API through an Authorization header rather than a query string.

Broadcast links use the existing server-only `CHAT_TOKEN_PEPPER`; no additional environment variable is required. The timer schema migration described above is required for real events. Rotating that secret invalidates all broadcast links and judge sessions.
