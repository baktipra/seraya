# SERAYA — Invitation Studio Slice B Unified State & Command Authority

## Status

Implementation branch for the locked `Invitation Studio Workspace Architecture Redesign V1`.

## Scope

Slice B establishes one client-side authority for:

- invitation draft content;
- dirty tracking;
- save lifecycle;
- the canonical save action;
- unsaved-navigation protection;
- submission payload generation.

The existing server action, validation schema, draft persistence, preview renderer, publication rules, payment gate, gallery behavior, and audio behavior are unchanged.

## Canonical state flow

```text
Draf tersimpan
↓ owner edits
Belum tersimpan
↓ one header action
Menyimpan
├─ success → Semua perubahan tersimpan
└─ failure → Gagal menyimpan; local changes remain intact
```

## Architectural decisions

- `InvitationStudioProvider` owns the reducer previously local to `InvitationEditor`.
- All Studio modes remain mounted beneath the same provider.
- The Studio header is the only dominant save authority.
- `InvitationEditor` remains the content surface but no longer owns persistence state.
- Mode switches use History state only and do not remount the provider.
- Leaving the Studio while dirty requires explicit confirmation.
- No server autosave is introduced.
- No database or migration change is required.

## Out of scope

- moving template and palette into Design mode;
- moving gallery and audio into Media mode;
- dedicated Preview mode;
- dedicated Publish mode;
- schema changes;
- production deployment.

## Validation gates

- focused formatting and lint;
- TypeScript;
- Slice A + Slice B unit contracts;
- production build;
- desktop and mobile Chromium smoke;
- state retention across all five modes;
- successful save transition;
- failed save retention and retry;
- dirty leave guard;
- exactly one canonical save button;
- no horizontal page overflow.
