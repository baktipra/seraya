# SERAYA — Invitation Studio Slice C Design Mode

## Status

Implementation branch for the locked `Invitation Studio Workspace Architecture Redesign V1`.

## Scope

Slice C activates the canonical **Desain** mode as the only authority for:

- template selection;
- palette selection;
- the largest exact local renderer preview;
- mobile and desktop preview viewport switching;
- design-specific validation feedback.

The mode reads and updates the same `InvitationStudioProvider` state introduced in Slice B. It does not create a second draft, save action, renderer contract, or persistence flow.

## Canonical owner flow

```text
Mode Desain
↓
Pilih Roselle / Aruna / Laras
↓
Pilih palet template aktif
↓
Preview exact berubah langsung
↓
Simpan melalui satu tombol di header Studio
↓
Terbitkan secara terpisah ketika siap
```

## Authority boundaries

- **Desain** owns template, palette, and exact local preview.
- **Isi** owns the remaining eight content chapters and no longer mounts a competing preview.
- The header from Slice B remains the single save command authority.
- Readiness still evaluates all nine invitation chapters, including Design.
- A readiness handoff for Design opens `?mode=design`; content handoffs open `?mode=content#bagian-*`.
- Local design changes do not modify the saved draft or published snapshot until the existing save and publish flows run.

## Preserved contracts

- draft schema and database schema;
- invitation save server action and validation;
- Roselle, Aruna, and Laras production renderers;
- published snapshot behavior;
- public and personal invitation routes;
- gallery and audio behavior;
- payment and publication gates;
- Slice A structural shell;
- Slice B unified state, dirty guard, and save lifecycle.

## Explicit exclusions

- no migration or schema change;
- no new templates, palettes, or fonts;
- no autosave;
- no drag-and-drop builder;
- no collaboration;
- no media-mode activation;
- no preview-mode activation;
- no publish-model or payment-model change;
- no RSVP, guestbook, guest-link, WhatsApp, or tracking change.

## Validation contract

- Roselle, Aruna, and Laras update the exact renderer from local shared state;
- palette changes update the renderer immediately;
- state survives switching between Design and Content;
- exactly one save action remains;
- save lifecycle remains owned by Slice B;
- mobile and desktop preview viewports work without page overflow;
- Slice A and Slice B tests remain green;
- production build remains green;
- no Vercel deployment is created from the Slice C branch.
