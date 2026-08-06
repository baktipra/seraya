# SERAYA — Owner Workspace Radical Simplicity Reset V2

## Status

Implementation and validation baseline for the authenticated owner workspace presentation layer.

## Problem

The previous owner workspace exposed too many destinations, status surfaces, and equal-weight cards before the owner could begin a concrete task. Operational pages also inherited an overly editorial visual language, including large serif headings and repetitive bordered cards.

The result was technically complete but cognitively heavy:

```text
understand the dashboard
→ understand the product structure
→ choose between many equal options
→ begin the actual wedding task
```

V2 reverses that order.

## Canonical project entry

The project start page exposes only three primary owner intentions:

```text
Edit undangan
Kelola tamu
Lihat respons
```

- **Edit undangan** leads to content, appearance, media, preview, and publication.
- **Kelola tamu** owns guest data, personal-link readiness, distribution, and follow-up handoffs.
- **Lihat respons** owns RSVP and guestbook outcomes.

`Ringkasan` and `Bagikan` are not primary navigation destinations. Project root is a quiet **Mulai** surface, while distribution remains available inside the guest workflow.

## Visual authority

The three project entries use information-bearing visuals:

- Edit undangan uses the canonical invitation renderer thumbnail.
- Kelola tamu uses a purpose-built guest roster visual.
- Lihat respons uses a purpose-built RSVP and response visual.

Decorative generic dashboard cards and arbitrary icons are not the governing visual pattern.

## Operational typography

The authenticated owner workspace uses the canonical UI sans stack:

```text
Geist / Inter / Segoe UI / system sans
```

Serif typography is reserved for:

- the Seraya wordmark;
- invitation previews;
- public and personal invitation composition where the selected template requires it.

Operational page titles, navigation, task labels, status, forms, and actions remain sans.

## Invitation launcher

The invitation workspace keeps all eleven canonical tasks but does not present them as eleven equal generic cards.

The launcher hierarchy is:

```text
current invitation thumbnail
→ one recommended next task
→ compact progress
→ grouped scannable task rows
```

Groups:

```text
Isi undangan
Tampilan & media
Selesaikan
```

Every task has a distinct, consistent glyph. The launcher continues to support:

- one shared draft;
- one `InvitationStudioProvider`;
- one save authority;
- local dirty state across task changes;
- browser history and legacy task URLs;
- accepted Design, Media, Preview, and Publish authorities from Invitation Studio A–G.

## Preserved product boundaries

V2 does not change:

- database schema or Supabase migrations;
- publication service or immutable snapshot behavior;
- payment and activation policy;
- personal guest-link lifecycle;
- RSVP or guestbook persistence;
- public and personal invitation renderers;
- media upload, removal, reorder, or playback contracts;
- owner authentication and authorization.

## Responsive contract

The workspace remains full-screen while content composition stays controlled:

- desktop uses the full available owner canvas;
- tablet reduces columns without creating competing panels;
- mobile stacks the three project entries and the invitation launcher;
- task rows remain touch-safe and scannable;
- document-level horizontal overflow is forbidden;
- the mobile project navigation contains only Undangan, Tamu, and Respons.

## Validation requirement

Acceptance requires:

- Prettier, ESLint, and TypeScript pass;
- V1 shared-draft and Invitation Studio A–G compatibility contracts pass;
- V2 source contracts pass;
- production Next.js build passes;
- Chromium desktop, tablet, and mobile regression passes;
- exactly three project start choices remain dominant;
- exactly one invitation save authority remains;
- eleven invitation tasks and eleven visual glyphs remain available;
- operational computed typography does not resolve to the editorial serif stack;
- no document-level horizontal overflow.

## Release safety

The feature branch is excluded from automatic Vercel preview deployment. Merge and production deployment require an explicit owner decision. No Supabase migration is required for this presentation-layer reset.
