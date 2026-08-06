# SERAYA — Invitation Studio Slice E Preview Mode & Version Truth Authority

## Status

Implementation branch for the locked `Invitation Studio Workspace Architecture Redesign V1`.

## Scope

Slice E activates the canonical **Preview** mode as the only owner-facing place that compares:

- local browser changes;
- the last saved private draft;
- the current immutable published snapshot.

The mode uses the production `InvitationTemplateRenderer` for Roselle, Aruna, and Laras. It does not introduce a separate preview renderer or publication state.

## Canonical owner flow

```text
Mode Preview
↓
Choose Local / Saved / Published
↓
Choose Generic / Personal simulation
↓
Choose Mobile / Desktop
↓
Inspect the exact selected source
↓
Return to editing, saving, or publishing in the appropriate mode
```

## Version truth

### Local

- Reads current `InvitationStudioProvider` content.
- Can include unsaved browser changes.
- Never claims that the server draft or guest invitation has changed.

### Saved

- Reads the last private invitation draft returned by the owner-only server screen.
- Excludes unsaved local changes.
- States whether that draft is newer than, synchronized with, or not yet represented by a published snapshot.

### Published

- Reads the current immutable `published_invitation_snapshots` record for the verified owner project.
- Displays the actual published revision.
- Uses public media and audio playback boundaries.
- Is unavailable when the project has never been published.

## Guest surfaces

- **Generic** reproduces the public informational invitation surface.
- **Personal simulation** uses an example guest name and inert RSVP/Guestbook controls.
- Personal simulation never creates a guest, guest link, RSVP, guestbook message, or tracking event.

## Query contract

```text
/dashboard/{projectId}/invitation
  ?mode=preview
  &version=local|saved|published
  &surface=generic|personal
  &viewport=mobile|desktop
```

Invalid values fall back safely. A requested published version falls back to the saved draft when no current published snapshot exists.

## Preserved compatibility

- `/dashboard/{projectId}/preview` remains available during the transition.
- public and personal invitation routes remain unchanged;
- publication snapshots remain immutable;
- the existing owner-only draft and public snapshot repositories remain the source of truth;
- the Studio header remains the single save authority;
- Preview contains no publish action and no readiness decision controls;
- no database migration is required.

## Explicit exclusions

- no publish or republish action migration;
- no payment changes;
- no guest-link generation;
- no RSVP or guestbook persistence;
- no read, opened, sent, or delivered tracking;
- no screenshot or visual-diff service;
- no collaboration or comments;
- no new template renderer;
- no Vercel deployment from the Slice E branch.

## Validation contract

- local, saved, and published sources render intentionally different fixture content;
- changing local content does not mutate saved or published preview truth;
- browser Back/Forward restores preview source state;
- personal simulation sends no mutation requests;
- published controls are disabled when no snapshot exists;
- generic/personal and mobile/desktop controls update the canonical query;
- exactly one Studio save action remains;
- no horizontal page overflow on desktop or mobile;
- Slice A through D contracts and publication compatibility tests remain green;
- production build remains green.
