# P0-A5 — Editor Runtime Recovery V1

Status: Implementation complete / final validation running
Program: Issue #37 — P0 Workspace Performance & Invitation Layout Recovery
Base: `eba8bdbc0ed0b3f7aed5c6ea5d5a41467d4ab535`

## Objective

Make the private invitation studio useful before non-visible chapters, the full template renderer, and gallery media begin doing work. Preserve local unsaved edits, strict server validation, publication authority, and the existing owner-only media boundary.

## Runtime changes

- Exactly one editor chapter is mounted at a time.
- The complete editable document is submitted through a strict JSON payload while gallery, metadata, and compatibility mirrors remain server-owned.
- The live preview renderer is moved to a dynamic client chunk.
- Desktop preview mounting waits for an idle opportunity; mobile loads it only after the owner opens Preview lokal.
- Preview content updates are buffered so rapid typing does not rerender the full invitation template on every keystroke.
- The editor route derives owner-proxy image URLs from verified draft IDs and no longer performs a gallery metadata query before rendering.
- Navigation and preview renderer boundaries are memoized.
- Separate `invitation_editor_shell_ready` and `invitation_editor_interactive_ready` events report total time, mounted panel count, and editor DOM node count without identifiers.

## Preserved contracts

- The server action still authenticates and re-verifies project ownership.
- Draft gallery membership, metadata, compatibility mirrors, snapshots, and publication state cannot be changed by the runtime payload.
- Field-level validation still maps to the canonical chapter and opens the first failing chapter.
- Unsaved navigation confirmation and explicit save semantics remain intact.
- Owner media bytes still pass through `/dashboard/media/:assetId`, which performs current-user and ready-asset validation.

## Validation gates

- `npm run audit:p0-a5:editor-runtime`
- strict payload parser and action tests
- invitation editor server/UI contracts
- invitation route contracts
- formatting, lint, TypeScript, full unit suite, production build
- general E2E, Invitation Experience, and Personal Response browser regressions

Authenticated before/after runtime numbers must be recorded from a clean preview before the slice is locked. Structural reductions are not represented as latency claims.
