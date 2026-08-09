# SERAYA — Owner Dashboard Cognitive Compression V1

## Status

Feature implementation branch for a narrow owner-dashboard maturity pass.

This milestone does not redesign the owner workspace. It reduces competing priorities inside the existing five-area information architecture and hardens the mobile project drawer interaction.

## Canonical owner information architecture

The five stable project destinations remain unchanged:

```text
Ringkasan
Undangan
Tamu
Bagikan
Respons Tamu
```

No sixth destination is introduced.

## Ringkasan compression contract

Ringkasan must answer one question first:

```text
Apa satu hal yang paling masuk akal dikerjakan owner sekarang?
```

The page therefore exposes exactly one priority-derived action at a time.

Priority derives only from existing readiness truth:

1. incomplete draft → complete invitation content;
2. ready but inactive → activate and publish;
3. ready to publish → publish;
4. published with unpublished changes → republish;
5. published with no guests → add guests;
6. published with recorded responses → monitor responses;
7. published with distributable guests and no recorded responses → open Bagikan;
8. published with guests but no distributable guests → repair guest readiness.

The four compact project pulse facts remain visible:

- invitation status;
- active guest count;
- recorded RSVP response count;
- ready-to-distribute guest count.

The five-step project journey and four simultaneous next-step rows are removed from the primary Ringkasan hierarchy.

## Bagikan compression contract

`/dashboard/:projectId/delivery` remains the single canonical Bagikan destination.

Inside Bagikan, two explicit views separate two different owner jobs:

```text
Undangan Pribadi  = default operational delivery view
Story & QR Publik = secondary public-promotion asset view
```

The default route without query parameters opens `Undangan Pribadi`.

`?view=public` opens `Story & QR Publik`.

No delivery, guest-link, contact-recording, public-share, or RSVP business authority changes. The milestone only changes presentation hierarchy so the public asset creator no longer sits above the personal delivery workflow in one long scroll.

## Mobile drawer accessibility contract

The visual pine drawer remains unchanged in concept.

Interaction now reuses Seraya's shared focus-management authority:

- initial focus moves inside the drawer when opened;
- Tab and Shift+Tab remain trapped while the modal drawer is open;
- Escape closes the drawer;
- body scrolling is locked while open;
- focus returns to the menu trigger when closed;
- the drawer exposes modal-dialog semantics;
- menu, settings, and close targets are at least 44 × 44 CSS pixels;
- bottom safe-area inset is respected.

## Preserved product boundaries

This milestone does not change:

- Supabase schema or migrations;
- owner authentication or authorization;
- invitation draft persistence;
- publication snapshots;
- payment activation policy;
- guest-link lifecycle;
- manual WhatsApp-only delivery policy;
- contact-record truth semantics;
- RSVP or guestbook persistence;
- public or personal invitation renderers;
- Invitation Studio architecture or save authority;
- the five-area owner information architecture.

## Deployment safety

The feature branch is explicitly disabled from automatic Vercel preview deployment.

No Supabase write and no production Vercel deployment are part of this implementation pass.

## Validation contract

The focused gate must prove:

- Prettier formatting passes for changed owner-dashboard surfaces;
- ESLint passes for changed TypeScript surfaces;
- TypeScript passes;
- existing Invitation Studio compatibility contracts remain green;
- production build passes;
- Ringkasan exposes exactly one priority action;
- Ringkasan no longer renders the journey or four simultaneous next-step rows;
- Bagikan defaults to Undangan Pribadi and exposes Story & QR Publik as a secondary view;
- mobile drawer initial focus, Escape close, and focus restoration work on tablet/mobile fixtures;
- no document-level horizontal overflow;
- accepted Invitation Studio media and responsive browser smokes remain green.
