# SERAYA — Release A Invitation Experience Parity Audit V1

## Status

In implementation. This audit belongs to the coordinated Release A program and is not a separately locked product milestone.

## Audited baseline

- Repository: `baktipra/seraya`
- Branch: `agent/release-a-flagship-experience`
- Governing production baseline: `e72923911913eb4213f7a81b3eac88a0475dff15`
- Templates: Roselle, Aruna, Laras
- Surfaces: generic, personal
- Viewports: desktop Chromium, Pixel 7

## Preserved contracts

- Generic invitation remains snapshot-only and free from guest-private data.
- Generic invitation has no RSVP or Guestbook form.
- Personal invitation remains token-authorized and no-store.
- Personal greeting stays near the opening.
- RSVP and Guestbook remain template-native near the closing journey.
- Existing RSVP, Guestbook, party-size, guest-link, publication, and persistence semantics are unchanged.
- No schema or migration change is introduced by this audit layer.

## Functional parity map

| Capability | Roselle | Aruna | Laras |
| --- | --- | --- | --- |
| Opening identity and date | Present | Present | Present |
| Personal greeting near opening | Present | Present | Present |
| Couple identity | Present | Present | Present |
| Story | Present | Present | Present |
| Multi-event schedule | Present | Present | Present |
| Event venue, address, and map | Present | Present | Present |
| Gallery | Present | Present | Present |
| Amplop Digital | Present in markup | Present and styled | Present and styled |
| Personal RSVP | Present | Present | Present |
| Personal Guestbook | Present | Present | Present |
| Generic response note | Present | Present | Present |
| Closing | Present in markup | Present and styled | Present and styled |
| Mobile single-column schedule | Source risk | Present | Present |
| Reduced-motion handling | Incomplete locally | Partial | Partial |

## Audit findings

### P0 — Roselle lower-journey presentation gap

Roselle renders Amplop Digital, personal response, the generic response note, and closing after the gallery. The Roselle module references presentation class names for those chapters, but the local CSS file ends after gallery hover behavior and does not define the referenced lower-journey selectors.

Impact:

- the final third of Roselle can fall back to minimally styled markup;
- generic and personal endings can feel less mature than the opening;
- Amplop Digital and response controls can visually detach from the template;
- mobile gallery and lower-section geometry lack a complete local contract.

Immediate response:

- add a scoped maturation layer for Roselle gift, greeting, response, generic note, closing, gallery layouts, and mobile composition;
- keep behavior and authority unchanged;
- add reduced-motion-safe template choreography.

### P0 — No complete invitation browser matrix

The existing permanent browser suite strongly covers generic/personal isolation, RSVP keyboard operation, state persistence, and Guestbook retry/persistence. It does not exercise the complete invitation with story, two events, gallery, Amplop Digital, and closing across all three templates.

Impact:

- a template can retain response behavior while losing a visual chapter;
- mobile overflow or chapter-order regressions can pass unnoticed;
- rich-content parity is not release-gated.

Immediate response:

- enrich the isolated fixture with realistic full invitation content;
- add 12 browser cases: three templates × two surfaces × two viewports;
- verify full chapter presence, ordering, private/public boundaries, image geometry, touch targets, and horizontal overflow.

### P1 — Laras monogram is hardcoded

The Laras opening currently renders the letter `L`, independent of the couple names.

Impact:

- the monogram reads as template branding rather than couple identity;
- personalisation quality is lower than the rest of the opening.

Planned response:

- derive a safe two-initial monogram from the couple display names;
- preserve a stable fallback for missing or unusual names;
- add a source and browser contract.

### P1 — Motion maturity is inconsistent

Roselle has decorative elements and hover behavior, while Aruna and Laras have only limited local transitions. None of the three templates has one consistent lightweight chapter-reveal system.

Immediate response:

- add CSS-only opening and view-timeline enhancement;
- keep content visible without JavaScript;
- disable all choreography under `prefers-reduced-motion`;
- avoid a new motion dependency.

### P1 — Implementation architecture is uneven

Roselle is split into chapter components. Aruna and Laras remain large single-file renderers.

Impact:

- visual iteration and parity review are slower for Aruna and Laras;
- shared chapter behavior is harder to compare;
- future maturation risks producing inconsistent one-off edits.

Planned response:

- do not rewrite during the first audit pass;
- split Aruna and Laras only when their flagship redesign requires chapter-level ownership;
- preserve the renderer and view-model boundaries.

### P2 — Gallery delivery can be hardened

All templates use lazy-loaded gallery images. They do not yet share one explicit decoding, responsive-size, or failure-presentation contract.

Planned response:

- add async decoding where appropriate;
- retain layout aspect ratios before image completion;
- add performance and failed-image review in the release-confidence pass.

## Implementation slices inside Release A

### Slice 1 — Audit gate and P0 Roselle completion

- full-content fixture;
- cross-template browser matrix;
- Roselle lower-journey styling;
- mobile gallery and response composition;
- reduced-motion-safe opening and chapter motion.

### Slice 2 — Flagship openings and collection identity

- Roselle opening maturation;
- dynamic Laras monogram;
- Aruna editorial opening refinement;
- distinct but equivalent mobile first-screen quality.

### Slice 3 — Full journey parity and release confidence

- story, schedule, maps, gallery, gift, response, and closing rhythm;
- media delivery and image stability;
- generic/personal cross-device visual review;
- production runtime and performance evidence.

## Acceptance evidence for this audit layer

- source audit document committed;
- rich isolated fixture committed;
- 12 complete-journey browser cases pass;
- existing 24 personal-response cases remain green;
- production build passes;
- no schema or migration change;
- no generic/personal authority regression;
- preview deployment is READY with no runtime error or fatal logs.
