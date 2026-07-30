# P0-A2/A3 — Navigation & Data-Boundary Recovery V1

Status: Implementation started  
Program: Issue #37 — P0 Workspace Performance & Invitation Layout Recovery  
Baseline: `53d4dceb5bc947ffc09dec62713ea4e924ffd581`

## Evidence driving the slice

The authenticated P0-A1 matrix recorded an overall p75 near 1.05 seconds on desktop and mobile. `Tamu → Bagikan` reached p75 1149 ms on desktop and 1405 ms on Pixel 7. One small RSC request consumed nearly the complete transition time, while the Pixel 7 baseline also exposed workspace content intercepting taps above the bottom navigation.

## Objectives

- restore intentional prefetch for the five canonical workspaces;
- provide immediate truthful pending feedback when a destination is activated;
- keep mobile workspace navigation physically tappable above content and safe-area boundaries;
- remove full wedding readiness from the shared project layout;
- introduce a lightweight owner-verified project-shell projection;
- reuse verified project context inside destination loaders where full readiness is still required;
- preserve all authorization, publication, payment, guest-link, RSVP, and Guestbook semantics.

## Explicit boundaries

- no schema or migration changes;
- no cross-user or cross-request private caching;
- no change to public or personal invitation authority;
- no readiness aggregate consolidation yet;
- no editor runtime restructuring yet;
- instrumentation from P0-A1 remains available for before/after comparison.
