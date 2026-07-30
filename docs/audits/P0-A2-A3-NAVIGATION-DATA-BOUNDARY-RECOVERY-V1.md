# P0-A2/A3 — Navigation & Data-Boundary Recovery V1

Status: Implementation and authenticated validation complete / pending owner review  
Program: Issue #37 — P0 Workspace Performance & Invitation Layout Recovery  
Baseline: `53d4dceb5bc947ffc09dec62713ea4e924ffd581`  
Measured recovery deployment: `ef9dc30720cc69ac4a53387fce2f8ed95440d30a`

## Evidence driving the slice

The authenticated P0-A1 matrix recorded an overall p75 near 1.05 seconds on desktop and mobile. `Tamu → Bagikan` reached p75 1149 ms on desktop and 1405 ms on Pixel 7. One small RSC request consumed nearly the complete transition time, while the Pixel 7 baseline also exposed workspace content intercepting taps above the bottom navigation.

## Navigation recovery

- restored intentional Next.js prefetch for the five canonical workspaces;
- added immediate pending state, spinner, `aria-busy`, and live-region feedback;
- retained the project shell and navigation while destination content loads;
- established an explicit stacking hierarchy:
  - project shell: `isolation: isolate`;
  - workspace main: `position: relative; z-index: 0`;
  - mobile navigation: `position: fixed; z-index: 100; pointer-events: auto`;
- reserved mobile bottom clearance for every project workspace;
- removed invitation-editor min-content overflow that expanded a 412 px Pixel 7 layout viewport to 1482 px;
- constrained the editor grid, form, panels, fieldsets, template picker, and mobile section navigation to the available inline size.

## Data-boundary recovery

- replaced full wedding readiness in the shared layout with a lightweight owner-verified project-shell projection;
- limited the shared shell read to couple identity and generic project status;
- reused the already verified project when composing invitation readiness;
- replaced Bagikan full-readiness loading with a bounded current-publication gate before delivery data;
- preserved request-local owner verification and existing unavailable-route behavior.

## Authenticated after-matrix

Method: one unrecorded warm-up cycle, then three ordinary-click client-navigation cycles for each of five transitions on Desktop Chrome and Pixel 7. Mobile clicks used normal Playwright pointer interaction; no force option was used.

| Device | Overall median | Overall p75 | Range | Result |
| --- | ---: | ---: | ---: | --- |
| Desktop Chrome | 29 ms | 29 ms | 27–34 ms | PASS |
| Pixel 7 | 30 ms | 30 ms | 30–31 ms | PASS |

| Device | Transition | Median | P75 |
| --- | --- | ---: | ---: |
| Desktop | Ringkasan → Undangan | 29 ms | 29 ms |
| Desktop | Undangan → Tamu | 28 ms | 28.5 ms |
| Desktop | Tamu → Bagikan | 29 ms | 31.5 ms |
| Desktop | Bagikan → Respons Tamu | 29 ms | 29 ms |
| Desktop | Respons Tamu → Ringkasan | 29 ms | 29 ms |
| Mobile | Ringkasan → Undangan | 30 ms | 30.5 ms |
| Mobile | Undangan → Tamu | 30 ms | 30 ms |
| Mobile | Tamu → Bagikan | 30 ms | 30.5 ms |
| Mobile | Bagikan → Respons Tamu | 30 ms | 30 ms |
| Mobile | Respons Tamu → Ringkasan | 30 ms | 30 ms |

All recorded clicks were served from the warmed prefetched route cache, so the click-time samples contained zero new RSC requests. This is the intended warm-navigation result; server-side route authorization and destination loading remain covered by the existing direct-route, unit, integration, build, and browser regression suites.

## Preserved boundaries

- no schema or migration changes;
- no cross-user or cross-request private caching;
- no change to public or personal invitation authority;
- no readiness aggregate consolidation;
- no editor state-machine or persistence restructuring;
- no payment, publication, guest-link, RSVP, or Guestbook semantic changes;
- no WhatsApp automation;
- temporary preview authentication and measurement infrastructure is removed before final review.
