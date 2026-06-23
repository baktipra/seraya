# SRY-008 — Published Invitation Runtime V1

## Boundary

SRY-008 separates private editable data from public runtime data:

```text
invitation_drafts (private/live)
  → owner-only publish function
  → published_invitation_snapshots (immutable/public)
  → /{slug} Roselle runtime
```

The public route never reads `invitation_drafts`, dashboard cookies, or a signed-in user session.

## M0007

`20260620000700_m0007_add_published_invitation_snapshots.sql` adds:

- `published_invitation_snapshots` with `CITEXT` slug, immutable JSONB snapshot, revision, template id, draft schema version, and current-state flag.
- partial unique indexes for one revision per project, one current snapshot per project, and one current snapshot per slug.
- a recursive raw-HTML safety trigger for snapshot JSONB.
- an immutability trigger that permits only `is_current: true → false` when a later revision supersedes it.
- RLS: anonymous reads only current snapshots of active published projects; owners can read own active/history snapshots; direct writes are not granted.
- `public.publish_invitation_snapshot(uuid)`, a security-definer transaction that checks authenticated ownership, copies current project metadata plus active draft content, marks the old current revision historical, inserts the new current Roselle snapshot, and marks the project `published`.

No client parameter can set snapshot JSON, project ownership, slug, template, revision, or project status.

## Public snapshot contract

The snapshot stores rendering data only:

```ts
{
  project: {
    slug: string;
    eventDatePrimary: string;
    eventCity: string;
    timezone: string;
  }
  draft: InvitationDraftV1;
}
```

It intentionally excludes account identity, email, draft IDs, sessions, payments, guest data, and dashboard metadata. The runtime parses this strict Zod contract before mapping it to Roselle.

## Cache behavior

Public lookup is cached with the tag:

```text
published-invitation:{slug}
```

The server publish action invalidates that tag and the public/dashboard paths after each publish or republish. The public route remains non-personalized and defaults to `noindex`, `nofollow`, and `noarchive`.

## Type generation

M0007 changes public database schema. After a local reset or a connected project migration, run:

```bash
npm run db:types
```

Do not add handwritten `database.types.ts`. Once generated types exist, parameterize the shared Supabase client alias with the generated `Database` type.
