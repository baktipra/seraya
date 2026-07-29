# SERAYA — Release A Invitation Experience Parity Audit V1

## Status

Slices 1, 2, and 3 are delivered in draft. The coordinated Release A engineering candidate is production-ready for owner visual smoke, but PR review, merge, acceptance, production promotion, and lock remain pending explicit owner direction. This audit is not a separately locked product milestone.

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
- No schema or migration change is introduced by Release A.

## Functional parity map

| Capability                                | Roselle                                   | Aruna                        | Laras                           |
| ----------------------------------------- | ----------------------------------------- | ---------------------------- | ------------------------------- |
| Distinct flagship opening identity        | Romantic letter                           | Asymmetric editorial cover   | Formal evening frame            |
| Immersive mobile first screen             | Added and gated                           | Added and gated              | Added and gated                 |
| Couple-owned opening monogram             | Not applicable                            | Not applicable               | Derived from both display names |
| Personal greeting near opening            | Present                                   | Present                      | Present                         |
| Couple identity                           | Present                                   | Present                      | Present                         |
| Story                                     | Present                                   | Present                      | Present                         |
| Multi-event schedule                      | Present                                   | Present                      | Present                         |
| Event venue, address, and map             | Present                                   | Present                      | Present                         |
| Stable gallery media frame                | Shared contract                           | Shared contract              | Shared contract                 |
| Lazy and asynchronous gallery delivery    | Gated                                     | Gated                        | Gated                           |
| Failed-image presentation                 | Geometry-preserving fallback              | Geometry-preserving fallback | Geometry-preserving fallback    |
| Amplop Digital                            | Repaired and gated                        | Present and styled           | Present and styled              |
| Personal RSVP                             | Repaired presentation; behavior preserved | Present                      | Present                         |
| Personal Guestbook                        | Repaired presentation; behavior preserved | Present                      | Present                         |
| Generic response note                     | Repaired presentation                     | Present                      | Present                         |
| Closing                                   | Repaired and gated                        | Present and styled           | Present and styled              |
| Mobile single-column schedule and gallery | Repaired and gated                        | Present                      | Present                         |
| Reduced-motion handling                   | Added                                     | Added                        | Added                           |

## Audit findings

### P0 — Roselle lower-journey presentation gap

Roselle renders Amplop Digital, personal response, the generic response note, and closing after the gallery. The Roselle module referenced presentation class names for those chapters, but its local CSS ended after gallery hover behavior and did not define the referenced lower-journey selectors.

Impact:

- the final third of Roselle could fall back to minimally styled markup;
- generic and personal endings could feel less mature than the opening;
- Amplop Digital and response controls could visually detach from the template;
- mobile gallery and lower-section geometry lacked a complete local contract.

Implemented response:

- added a scoped maturation layer for Roselle gift, greeting, response, generic note, closing, gallery layouts, and mobile composition;
- kept behavior and authority unchanged;
- added reduced-motion-safe template choreography.

### P0 — No complete invitation browser matrix

The existing permanent browser suite strongly covered generic/personal isolation, RSVP keyboard operation, state persistence, and Guestbook retry/persistence. It did not exercise the complete invitation with story, two events, gallery, Amplop Digital, and closing across all three templates.

Implemented response:

- enriched the isolated fixture with realistic full invitation content;
- added 12 browser cases: three templates × two surfaces × two viewports;
- verifies full chapter presence, ordering, private/public boundaries, opening geometry, media geometry, touch targets, horizontal overflow, and layout-shift budget;
- kept the existing 24 personal-response cases as a separate permanent gate;
- aligned the isolated fixture stylesheet graph with the production root layout so browser evidence exercises the actual release layers.

### P1 — Laras monogram was hardcoded

The Laras opening previously rendered the letter `L`, independent of the couple names. That made the monogram read as template branding rather than couple identity.

Implemented response:

- derives a safe two-initial monogram from both couple display names;
- trims names, handles Unicode characters, and applies Indonesian locale-aware uppercase;
- preserves `L` only as a stable fallback when neither name provides an initial;
- adds source and browser contracts;
- showroom couple Mira and Arga resolves to `MA`, while the browser fixture Raka and Nadia resolves to `RN`.

### P1 — Opening maturity and collection identity were inconsistent

The three templates had functional parity but did not present equivalent first-screen confidence. Roselle had the strongest romantic chapter language, while Aruna and Laras relied on simpler opening compositions.

Implemented response:

- Roselle now opens as a warm romantic letter with softer circular depth and fuller typographic presence;
- Aruna now opens as an asymmetric editorial cover with stronger type direction and date composition;
- Laras now opens as a formal evening frame with deeper ceremonial contrast and couple-owned monogram identity;
- each template keeps a distinct composition rather than cloning Roselle;
- mobile first screens use an immersive minimum height and template-specific responsive composition;
- content remains visible without JavaScript and all opening choreography is disabled under `prefers-reduced-motion`;
- no motion dependency was introduced.

### P1 — Gallery delivery and failure stability were inconsistent

The three templates previously rendered separate raw gallery `<img>` elements. They were lazy-loaded, but they did not share one decoding, responsive-size, intrinsic-dimension, loading-state, or failed-image contract.

Impact:

- browser delivery intent was incomplete and inconsistent;
- a failed image could produce an unhelpful broken-image presentation;
- loading and failure behavior could visually detach from each template;
- release confidence did not include measured layout-shift or failure-geometry evidence.

Implemented response:

- introduced one shared `InvitationGalleryImage` component while preserving template-owned figures, crops, and chapter rhythm;
- uses `loading="lazy"`, `decoding="async"`, `fetchPriority="low"`, responsive `sizes`, and intrinsic `900 × 1125` dimensions;
- exposes explicit loading, ready, and failed states;
- shows a truthful `Foto belum dapat ditampilkan` fallback without collapsing or resizing the gallery frame;
- provides a reduced-motion-safe shimmer and state transition layer;
- routes Roselle, Aruna, and Laras through the same media contract;
- adds source contracts and browser assertions for every media attribute and state;
- programmatically exercises load and error states in every generic and personal browser case;
- verifies failure changes media-frame width and height by less than one pixel;
- enforces a cumulative layout-shift test budget of at most `0.05` across the 12-case matrix.

### P1 — Implementation architecture is uneven

Roselle is split into chapter components. Aruna and Laras remain large single-file renderers.

Decision:

- do not rewrite only for structural symmetry;
- split Aruna and Laras only when a later chapter-level redesign materially benefits from it;
- preserve the renderer and view-model boundaries.

## Implementation slices inside Release A

### Slice 1 — Audit gate and P0 Roselle completion

Delivered in draft:

- full-content fixture;
- cross-template browser matrix;
- Roselle lower-journey styling;
- mobile gallery and response composition;
- reduced-motion-safe opening and chapter motion;
- preview-only six-combination invitation showroom.

### Slice 2 — Flagship openings and collection identity

Delivered in draft:

- deeper Roselle romantic opening;
- Aruna asymmetric editorial opening;
- Laras formal-evening opening;
- dynamic Laras couple monogram;
- distinct but equivalent mobile first-screen quality;
- reduced-motion contract;
- source contract and strengthened 12-case browser matrix.

### Slice 3 — Media delivery, image stability, and final release confidence

Delivered in draft:

- shared gallery-media component across all collections;
- asynchronous, lazy, low-priority delivery intent with responsive sizing and intrinsic dimensions;
- loading, ready, and failed media states;
- geometry-preserving failed-image fallback;
- reduced-motion-safe loading presentation;
- source contract for the shared media boundary;
- 12-case browser evidence for media attributes, load/error behavior, overflow, and `≤ 0.05` layout-shift budget;
- production build, Release A flagship regression, general end-to-end regression, and existing 24-case personal-response regression;
- READY preview deployment and clean runtime error/fatal scan.

## Owner visual-smoke boundary

The engineering fixture and review showroom use fictitious images. Automated evidence proves delivery attributes, state behavior, responsive geometry, privacy composition, and layout stability; it cannot judge whether a future couple's final photography crop, pose, lighting, or visual balance feels ideal inside every template.

That content-specific judgment remains an owner visual-smoke step. It is not evidence of a missing schema, renderer, media-delivery, RSVP, Guestbook, or route-authority implementation.

## Acceptance evidence for Release A engineering candidate

- source audit document committed and synchronized through Slice 3;
- rich isolated fixture committed and aligned with production styles;
- opening identity and media-delivery source contracts pass;
- 12 complete-journey browser cases pass across three templates, two surfaces, and two viewports;
- gallery load and failure states preserve frame geometry within one pixel;
- browser layout-shift score remains within the `0.05` test budget;
- existing 24 personal-response cases remain green;
- general end-to-end and Release A flagship browser workflows pass;
- production Next.js build passes;
- preview deployment `dpl_DDb95gS8YeX9djBLYNZpZFJGojTu` is READY;
- Laras personal showroom returns HTTP 200 and `noindex`, with dynamic `MA` monogram and the shared media-delivery markup;
- all six generic-surface browser cases retain exactly one generic response note and no private response journey;
- preview runtime error/fatal logs are empty;
- no schema or migration change;
- no generic/personal authority regression;
- no RSVP, Guestbook, payment, publish, or guest-link lifecycle semantic change.
