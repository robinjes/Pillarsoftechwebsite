# Media security contract

Staff media uploads use a two-step server-authorized flow:

1. `POST /api/admin/media/sign` validates the claimed MIME type and size,
   creates an owner-bound `incoming` row, then returns a one-time Supabase
   Storage upload token for a server-generated key.
2. The browser uploads directly to the private `incoming-media` bucket with
   `upsert: false` and calls `POST /api/admin/media/finalize`.
3. Finalization claims the row, checks magic bytes and the actual size, samples
   video headers with a bounded range request, and re-encodes images with
   `sharp` so metadata is not retained. Approved images/videos move to the
   public `public-media` bucket; PDFs move to the private `private-documents`
   bucket.

Private PDFs are referenced by the staff-only site path
`/api/admin/media/<uuid>`. That route verifies staff authorization, verifies the
finalized database row, and creates a short-lived Supabase signed redirect on
demand. The short-lived URL is never persisted as event content. The public
`/api/media/<uuid>` route serves only finalized public image/video media.

The service-role key is required for all storage/database finalization work.
Browser roles receive no storage write policies. Stale `incoming` and
`processing` rows are bounded-cleaned during later sign requests; their
objects are removed and rows are marked rejected. No remote migration or
storage change is applied by local validation.
