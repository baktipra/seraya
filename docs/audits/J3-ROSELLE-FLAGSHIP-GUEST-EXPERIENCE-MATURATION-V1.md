# J3 — Roselle Flagship Guest Experience Maturation V1

Status: Implemented / validation pending  
Baseline: `1eca9a8e67f5c4be0c4cf298709f5aae41f1c6b7`

## Objective

Mature Roselle from a visually complete invitation into a clearer end-to-end guest journey without changing invitation authority, privacy boundaries, persistence, RSVP, Guestbook, payment, or publication semantics.

## Delivered experience

### Opening handoff

- Replaces the decorative-only scroll cue with a keyboard-focusable `Buka undangan` action.
- Generic invitations target the couple chapter.
- Personal invitations target the addressed guest greeting.
- Keeps a minimum touch target, visible focus treatment, mobile behavior, and reduced-motion-safe transitions.

### Addressed personal letter

- Presents the existing personal greeting as a distinct addressed-letter region.
- Preserves the canonical guest name and greeting content.
- Adds no private data to the generic surface.

### Ordered response journey

- Numbers only the RSVP and Guestbook steps that are actually available.
- A full RSVP + Guestbook journey renders `Langkah 1 dari 2` and `Langkah 2 dari 2`.
- A single available response capability remains `Langkah 1 dari 1`.
- Existing forms, submission routes, state, and persistence remain unchanged.

### Closing navigation

- Adds a keyboard-accessible `Kembali ke awal` action after the closing chapter.
- Returns to the canonical Roselle invitation title without introducing JavaScript navigation.

## Regression evidence

- Source contract verifies release-layer ordering, surface-aware opening targets, addressed-letter semantics, dynamic response numbering, focus treatment, mobile behavior, and reduced-motion handling.
- Invitation browser configuration now includes a dedicated Roselle flagship regression on desktop Chromium and Pixel 7.
- Browser coverage verifies generic and personal targets, keyboard focus, guest-name preservation, response-step ordering, and return-to-opening behavior.
- The existing complete cross-template invitation matrix continues to protect chapter ordering, privacy isolation, overflow, gallery stability, touch targets, and layout-shift budget.

## Preserved boundaries

- no schema or migration changes;
- no publication or payment authority changes;
- no generic/personal route authority changes;
- no guest-link lifecycle changes;
- no RSVP or Guestbook semantic changes;
- no invitation payload or view-model rewrite;
- no Aruna or Laras presentation changes.
