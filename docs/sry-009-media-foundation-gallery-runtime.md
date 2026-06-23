# SRY-009 — Media Foundation & Gallery Runtime V1

## Boundary

SRY-009 adds a private, project-owned gallery media layer without changing the invitation draft or published snapshot shapes:

```text
private Storage object
  → public.media_assets metadata
  → invitation_drafts.content.gallery.imageIds (private/live)
  → publish snapshot copy
  → owner /dashboard/media/[assetId] or public /media/[assetId] proxy
```

`gallery.imageIds` remains the ordered rendering source. No Storage URL, signed read URL, original filename, project id, account id, or asset status is passed to Roselle.

## M0008 — media assets and private Storage

`20260620000800_m0008_add_media_assets_and_private_storage_foundation.sql` adds `public.media_assets` with:

- one project foreign key and opaque unique storage path;
- `invitation-media` bucket-only, `gallery_image`-only metadata;
- JPEG/PNG/WebP MIME constraints and an exact 10 MB size limit;
- locked existing `media_status` lifecycle (`processing → ready|failed`, `ready → deleted`);
- immutable ready storage identity and timestamp handling;
- a private `storage.buckets` record with no public read policy;
- owner-only metadata `SELECT` RLS, with browser `INSERT`, `UPDATE`, and `DELETE` revoked;
- a server-only `finalize_gallery_media_asset` transaction that changes one valid processing asset to ready and appends it once to the live draft gallery;
- a database gallery limit of 12 image IDs;
- replacement of the M0007 publish function so a snapshot can only reference ready, non-deleted media owned by its project.

Removing an image from the gallery changes only the live draft list. It does not delete the `media_assets` row or Storage object, so an existing snapshot remains stable until republish.

## Upload and validation

1. The owner calls the server-only reserve route. The service verifies project ownership, gallery capacity, declared MIME, and declared byte size.
2. It inserts a `processing` row with a generated path: `projects/{projectId}/gallery/{assetId}.{extension}`. Original file names are never accepted into the path.
3. The service creates a short-lived signed upload URL with `upsert: false`. The URL is transport-only: it is not stored or rendered, and it is not returned after finalization.
4. The browser uploads to the private bucket, then calls finalization.
5. The server downloads the object using `SUPABASE_SERVICE_ROLE_KEY`, checks actual JPEG/PNG/WebP magic bytes and exact byte size, then executes the atomic database finalizer. Invalid bytes mark the reserved row failed and never enter `gallery.imageIds`.

## Runtime visibility

- `/dashboard/media/[assetId]` is owner-only, dynamic, `private, no-store`, and returns validated binary bytes.
- `/media/[assetId]` is cookie-free/static ISR with tag `published-media:{assetId}`. It returns bytes only if the asset is ready, belongs to the current published project, and is referenced by that project’s current snapshot gallery IDs. It never returns a direct Storage URL.
- Publishing and republishing invalidate the invitation cache tag/path and the union of previous/current public media tag/path entries.

Both routes set `Content-Type`, `Content-Disposition: inline`, and `X-Content-Type-Options: nosniff`. The public route uses public CDN cache headers; the private route is never cacheable.

## Local environment and types

`SUPABASE_SERVICE_ROLE_KEY` is required in `.env.local` for real media reserve/finalize and proxy runtime. It is server-only and must never have a `NEXT_PUBLIC_` prefix.

M0008 changes the active schema. With Docker-backed local Supabase or an approved cloud project:

```bash
npm run supabase:start
npm run db:reset
npm run db:types
```

Do not add handwritten `database.types.ts`; the generated output remains the source of truth when type generation is available.

## Verification

The PGlite database harness creates a metadata-only `storage.buckets` stand-in because PGlite does not ship Supabase Storage catalog tables. The real M0008 bucket statement is still executed; object-byte validation is covered by server service tests. Docker-backed `supabase db reset` remains the final Storage-integrated validation when Docker is available.
