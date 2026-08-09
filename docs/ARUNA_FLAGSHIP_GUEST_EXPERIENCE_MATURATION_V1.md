# SERAYA — Aruna Flagship Guest Experience Maturation V1

## Status

Implementation candidate. Owner acceptance pending.

## Goal

Raise Aruna from a competent modern template into a flagship-level **modern editorial wedding journal** without changing Seraya's invitation data, privacy, response, publication, or guest-link authorities.

The target reading journey is:

`cover → addressed greeting → couple feature → story → agenda & venue → photo essay → gift desk → RSVP & ucapan → colophon → return to opening`

## Design principle

Aruna must not read as Roselle with different styling or as a sequence of dashboard cards.

The maturity layer strengthens:

- directional cover hierarchy;
- editor's-note treatment for the personal greeting;
- asymmetric editorial columns for couple and story chapters;
- agenda-style multi-event presentation;
- venue brief instead of a generic location card;
- magazine-like photo essay rhythm;
- ledger-like digital gift presentation;
- one ordered editorial reply desk for RSVP and Guestbook;
- a deliberate colophon and return-to-opening ending;
- mobile reflow, focus visibility, touch targets, and reduced motion.

## Architecture

The implementation is intentionally additive:

- existing `aruna-template.tsx` remains the canonical renderer;
- existing `aruna-guest-experience.module.css` remains the journal-v1 foundation;
- `src/app/aruna-flagship-maturation-release.css` is a presentation-only overlay loaded after the shared template quality bar;
- the overlay targets existing stable `data-aruna-*` and shared invitation attributes;
- no duplicated invitation data or response implementation is introduced.

## Preserved boundaries

This milestone does **not** change:

- Supabase schema, migrations, or stored project/guest data;
- `InvitationViewModel` or published snapshot shape;
- generic versus personal route authorization;
- guest-link lifecycle or capability material;
- RSVP validation, party-count semantics, persistence, or submission actions;
- Guestbook persistence or submission actions;
- audio, gallery, countdown, maps, calendar, livestream, or remote-attendance semantics;
- payment or publication authority;
- owner dashboard or Invitation Studio authority;
- Roselle or Laras presentation.

Generic invitation surfaces still contain no personal greeting, RSVP form, or Guestbook form. Personal surfaces continue to receive those slots only through the canonical template renderer boundary.

## Validation contract

The milestone is accepted only when the locked candidate passes:

- focused Prettier and ESLint for the changed invitation files;
- TypeScript / production build;
- Aruna flagship source contract;
- existing invitation opening/media contracts;
- desktop and mobile cross-template invitation browser regression;
- dedicated Aruna generic and personal browser regression;
- no horizontal overflow in the Aruna browser fixture;
- no new Vercel preview deployment for the feature branch.

## Deployment discipline

`feature/aruna-flagship-guest-experience-maturation-v1` is disabled from automatic Vercel preview deployment. Owner acceptance does not imply merge or production deployment.
