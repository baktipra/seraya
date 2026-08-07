# SERAYA — Owner Workspace Editorial Dashboard V3

## Status

Feature implementation branch for the authenticated owner workspace presentation layer.

## Visual authority

The owner project workspace now follows the supplied Seraya dashboard reference:

- pine project sidebar;
- warm paper canvas;
- brass as the restrained highlight/accent;
- Fraunces for page and panel hierarchy only;
- sans typography for operational copy, forms, tables, status, and actions;
- soft borders, compact cards, and low-elevation surfaces.

## Canonical owner information architecture

The project sidebar exposes five stable owner destinations:

```text
Ringkasan
Undangan
Tamu
Bagikan
Respons Tamu
```

Existing routes and domain ownership remain unchanged:

- Ringkasan = `/dashboard/:projectId`
- Undangan = `/dashboard/:projectId/invitation`
- Tamu = `/dashboard/:projectId/guests`
- Bagikan = `/dashboard/:projectId/delivery`
- Respons Tamu = `/dashboard/:projectId/rsvp`

Legacy aliases continue to resolve to their existing canonical owner areas.

## Ringkasan contract

The project root becomes a project-status dashboard rather than a destination launcher.

It shows only readiness-backed information:

- invitation state;
- active guest count;
- RSVP response count;
- ready-to-distribute guest count;
- five-stage project journey;
- four actionable next-step rows.

No fabricated event date, read tracking, delivery tracking, or guest activity data is introduced.

## Preserved product boundaries

V3 does not change:

- Supabase schema or migrations;
- owner authentication or authorization;
- invitation draft persistence;
- publication snapshot semantics;
- payment activation policy;
- guest-link lifecycle;
- manual WhatsApp handoff rules;
- RSVP or guestbook persistence;
- public/personal invitation rendering;
- Invitation Studio task/save authority.

## Responsive behavior

Desktop keeps a persistent 248px project sidebar. Tablet and mobile replace it with a compact project context bar and an accessible slide-in drawer. The primary workspace remains one content canvas with no document-level horizontal overflow by design.

## Release safety

The feature branch is explicitly excluded from automatic Vercel preview deployment. No production deployment and no Supabase mutation are part of this implementation pass.
