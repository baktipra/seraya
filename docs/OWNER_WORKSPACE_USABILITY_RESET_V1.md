# SERAYA — Owner Workspace Usability Reset V1

## Status

Implementation branch with validation-only Draft PR #85. Not merged, not deployed, and no Supabase migration.

Automated validation is still pending because GitHub Actions has not created a workflow run for the connector-created branch and PR events. The milestone must not be marked green or locked until the permanent gate actually runs successfully.

## Product decision

Seraya keeps the accepted Invitation Studio A–G architecture as the underlying state, media, preview, and publication authority. The owner-facing surface is reset around a simpler mental model:

```text
Open Undangan
→ choose one concrete task
→ complete that task
→ save
→ return to the task list
```

The owner no longer needs to understand modes, version layers, readiness systems, or publication terminology before beginning normal editing work.

## Full-screen dashboard authority

The authenticated dashboard uses the full browser width. The global centered shell cap is removed from the dashboard top bar and main content area.

The project rail remains visible on desktop. Studio and operational workspaces—Tamu, Bagikan, Respons Tamu, and Follow-up—fill the remaining width so tables, filters, and metrics can use the available screen. Reading and standard-width surfaces retain internal limits so forms and long text do not stretch unnaturally.

This full-screen decision applies only to the authenticated owner dashboard. Marketing and invitation guest surfaces are unchanged.

## Canonical invitation entry

`/dashboard/{projectId}/invitation` opens the Task Launcher.

Canonical task URLs use:

```text
/dashboard/{projectId}/invitation?task=<task>
```

Tasks:

1. Mempelai
2. Sampul & pembuka
3. Acara
4. Cerita
5. Galeri & musik
6. Amplop Digital
7. RSVP
8. Penutup
9. Tema & warna
10. Preview
11. Terbitkan

Legacy `mode=design|media|preview|publish` URLs and `#bagian-*` content links remain readable as compatibility inputs.

## Single-task editing

Only one content task is visible at a time. All content tasks continue to edit the same `InvitationStudioProvider` draft.

Switching tasks does not recreate the draft or discard browser-local changes. The canonical header contains exactly one save action connected to the existing server save action and form payload.

Design, media, preview, and publication tasks continue using the accepted A–G implementations. This reset changes their entry and framing, not their business authority.

The Galeri & musik task now also contains the draft-owned “Tampilkan galeri” control. Upload, reorder, replacement, removal, and audio operations retain their existing owner-only media authority, while gallery visibility remains part of the shared draft and uses the single Studio save action.

## Task launcher truth

Each task card shows a human-readable summary and state such as:

- Lengkap
- Belum lengkap
- Tidak ditampilkan
- Perlu diperbaiki
- Media siap
- Siap diterbitkan
- Perlu diterbitkan ulang

The launcher may summarize progress but does not introduce sent, delivered, opened, or read tracking.

## Preserved boundaries

This milestone does not change:

- invitation draft schema;
- Supabase schema or migrations;
- publication snapshots;
- payment eligibility;
- guest links or token lifecycle;
- generic or personal invitation renderers;
- RSVP or Guestbook behavior;
- media authorization and storage;
- manual-only WhatsApp delivery policy.

## Validation contract

The permanent gate must prove:

- focused formatting, lint, and TypeScript pass;
- production build pass;
- task routing and legacy compatibility contracts pass;
- exactly one save authority exists;
- eleven concrete tasks are available;
- owner dashboard no longer uses the global centered shell cap;
- operational and Studio workspaces can use the full remaining dashboard width;
- task launcher and focused editor work on desktop, tablet, and mobile;
- unsaved local content survives task changes;
- browser Back restores the previous task;
- gallery visibility remains controlled by the shared draft and single save action;
- no document-level horizontal overflow;
- Invitation Studio A–G compatibility contracts remain green.
