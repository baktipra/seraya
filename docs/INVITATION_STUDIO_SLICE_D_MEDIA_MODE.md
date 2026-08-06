# SERAYA — Invitation Studio Slice D Media Mode & Asset Authority

## Status

Implementation branch for the locked `Invitation Studio Workspace Architecture Redesign V1`.

## Scope

Slice D activates the canonical **Media** mode as the only workspace authority for:

- gallery image upload;
- gallery image removal;
- gallery ordering;
- invitation audio upload, replacement, and removal;
- private asset status and published-version truth.

The mode reuses the existing private media bucket, owner-only API routes, binary validation, active-draft references, and publication snapshot boundary. It does not introduce a second draft or a second Studio save action.

## Canonical owner flow

```text
Mode Media
↓
Galeri / Audio
↓
Upload, reorder, replace, or remove private assets
↓
Media operation commits after its API succeeds
↓
Mode Isi controls whether the existing gallery composition is shown
↓
Studio Header saves content composition changes
↓
Publish / republish sends the saved draft to guests
```

## Authority boundaries

### Media operations

Gallery membership, order, and audio asset references are persisted by their owner-only media endpoints after validation succeeds. They synchronize the in-memory `InvitationStudioProvider` without creating content dirtiness.

### Content composition

`gallery.enabled` remains an invitation-content decision. It is changed in Mode Isi, marks the Studio dirty, and is saved through the single header command introduced in Slice B.

### Published truth

Media changes update only the private active draft. An already published invitation continues serving its current snapshot until the owner republishes. The UI must never imply that upload success means guests already see the asset.

## Gallery reorder security contract

`POST /api/projects/{projectId}/gallery/reorder`:

- requires the current authenticated owner;
- returns private, no-store responses;
- accepts at most twelve unique UUIDs;
- accepts only an exact permutation of the active draft gallery IDs;
- cannot attach guessed, foreign, deleted, or newly injected asset IDs;
- preserves `gallery.enabled`;
- updates only the private active draft.

## Compatibility

- `/dashboard/{projectId}/gallery` remains available as a standalone compatibility surface.
- Existing upload, finalize, remove, playback, and binary proxy routes are preserved.
- Existing service callers that omit the new `gallery` composition input preserve the current draft visibility state.
- Roselle, Aruna, and Laras continue reading the same normalized draft and asset references.

## Explicit exclusions

- no database migration or schema change;
- no storage bucket change;
- no image crop, filter, enhancement, or AI editing;
- no drag-and-drop dependency;
- no external audio URL;
- no autoplay;
- no server autosave;
- no change to payment, publish, guest-link, RSVP, or guestbook behavior;
- no delivery, open, or read tracking.

## Validation contract

- gallery and audio managers render only inside canonical Mode Media in the invitation workspace;
- gallery reorder updates local shared state only after the owner-only endpoint succeeds;
- audio removal updates shared state without requiring a second Studio save;
- gallery visibility creates normal Studio dirtiness and uses the header save command;
- exactly one Studio save action remains;
- standalone gallery compatibility remains build-safe;
- Slice A, B, and C contracts remain green;
- desktop and mobile have no horizontal page overflow;
- no Vercel deployment is generated from the Slice D branch.
