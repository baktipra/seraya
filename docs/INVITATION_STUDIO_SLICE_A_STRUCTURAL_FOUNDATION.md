# SERAYA — Invitation Studio Slice A Structural Foundation

## Status

Implementation slice on top of `fe66bdca54c3c573f92e7c650ccdd5e7a31c8400`.

## Goal

Replace the invitation workspace's implicit DOM-order layout authority with an explicit five-mode shell while preserving every existing editor, media, readiness, save, preview, payment, and publication behavior.

## Canonical modes

- Isi (`content`)
- Desain (`design`)
- Media (`media`)
- Preview (`preview`)
- Terbitkan (`publish`)

## Slice A behavior

- The existing invitation route remains the canonical route.
- Existing readiness, audio, and editor behavior remain mounted inside the Isi slot.
- Mode changes use client-side history state and do not remount the legacy editor.
- The URL records the selected mode through `?mode=`.
- Non-Isi modes expose structural canvases only; functional migration belongs to later slices.
- The existing saved-preview route remains available.

## Layout authority

The shell now owns named header, mode-navigation, canvas, and panel regions. Its CSS contains no `:global`, `:nth-child`, adjacent-sibling form targeting, or last-child command targeting.

## Non-goals

- no Supabase migration;
- no draft schema change;
- no server autosave;
- no editor field movement;
- no media behavior movement;
- no readiness or publication behavior movement;
- no route redirect;
- no Vercel production deployment.

## Validation contract

- focused Prettier and ESLint;
- TypeScript;
- structural unit contracts;
- production build;
- desktop and Pixel 7 Chromium smoke;
- mode URL and keyboard behavior;
- no header/navigation/canvas overlap;
- no page-level horizontal overflow.
