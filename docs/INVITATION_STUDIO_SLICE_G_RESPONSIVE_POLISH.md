# Invitation Studio Slice G — Responsive Studio Polish & Final Regression

## Status

Implementation complete; formatted clean-head validation in progress on:

`feature/invitation-studio-slice-g-responsive-polish`

Baseline:

`f92df98f29ce3c1d45d4d84e54caf7a7b8c57fb9`

## Goal

Close the Invitation Studio sequence by making the already accepted five-mode workspace resilient across desktop, tablet, and mobile without reopening product architecture or publication behavior.

Slice G owns responsive composition and final A–G regression evidence. It does not create a new feature authority.

## Responsive authority

The canonical Studio shell supplies one scoped responsive root. Each canonical mode becomes an inline-size container so layout progression follows the actual Studio canvas width inside the dashboard, not the browser viewport alone.

The responsive layer covers:

- Studio header, status, save authority, and mode strip;
- active-mode visibility in the horizontally scrollable mode navigation;
- Content chapter navigation and narrow-screen form boundaries;
- Design controls, exact preview, and sticky split behavior;
- Media summary, tabs, and embedded manager boundaries;
- Preview version, surface, viewport controls, and device frame;
- Publish version truth, readiness grid, and primary decision surface;
- coarse-pointer touch targets, reduced motion, safe-area padding, and overflow containment.

## Preserved authorities

Slice G preserves all locked contracts from Slice A through F.1:

- five named Studio modes;
- one mounted provider, reducer, and local draft authority;
- one save action in the Studio header;
- canonical Design, Media, Preview, and Publish mode ownership;
- existing invitation renderer and public/personal composition;
- existing gallery and audio owner-only operations;
- payment eligibility and publication services;
- immutable published snapshot and revision truth;
- private dynamic no-store Studio route;
- existing readiness, guest-link, RSVP, and guestbook semantics.

## Explicit exclusions

Slice G does not include:

- database or Supabase migration;
- new media storage, renderer, payment, or publication behavior;
- autosave or a second save action;
- public invitation redesign;
- guest-link, RSVP, guestbook, delivery, or tracking changes;
- dashboard-wide redesign outside the Invitation Studio boundary;
- Vercel preview or production deployment;
- merge to `main` without explicit approval.

## Final regression matrix

The permanent validation gate must prove:

1. formatting, focused lint, TypeScript, and production build pass;
2. Slice A–G unit and compatibility contracts pass together;
3. publication schema/service, payment policy, and private route regressions remain green;
4. all five canonical modes render inside the Studio canvas without document-level horizontal overflow;
5. exactly one header save authority remains visible;
6. active mode navigation remains visible and keyboard mode movement remains valid;
7. Design, Media, Preview, and Publish controls adapt to actual container width;
8. unsaved local state survives mode switches and desktop-to-tablet-to-mobile resizing;
9. browser smoke passes in desktop, tablet, and mobile Chromium projects;
10. no deployment or migration is created by the validation pass.

## Acceptance boundary

Slice G can be proposed as `Accepted / Locked` only after the permanent clean-head workflow passes and the final audit confirms:

- branch head and evidence artifact;
- no temporary workflow residue;
- `main` unchanged;
- zero Vercel deployments created by Slice G;
- no database migration;
- no merge or production release.
