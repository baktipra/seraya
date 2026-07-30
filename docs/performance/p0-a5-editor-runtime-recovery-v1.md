# P0-A5 — Editor Runtime Recovery V1

Status: Implementation complete / validation complete
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

## Production runtime evidence

The A4 revision and A5 revision were built and served in production mode on the same GitHub Actions runner with the same deterministic editor fixture. Desktop Chrome and Pixel 7 each ran three fresh browser contexts.

This evidence isolates editor hydration, React rendering, DOM, bundle delivery, chapter switching, and preview deferral. It intentionally excludes Vercel, Supabase, authentication, and network latency, so it must not be represented as an end-to-end workspace latency result.

| Revision | Device | Shell median | Chapter-ready median / p75 | Mounted panels | Editor DOM nodes | Initial JS | Mobile preview deferred |
|---|---|---:|---:|---:|---:|---:|---|
| A4 before | Desktop | 152 ms | 235 / 302 ms | 9 | 519 | 166,508 bytes | n/a |
| A4 before | Pixel 7 | 151 ms | 220 / 226 ms | 9 | 519 | 166,508 bytes | No |
| A5 after | Desktop | 132 ms | 179 / 194 ms | 1 | 244 | 162,011 bytes | n/a |
| A5 after | Pixel 7 | 123 ms | 178 / 179 ms | 1 | 244 | 162,011 bytes | Yes |

Observed structural and runtime change:

- Mounted editor panels: 9 → 1, an 88.9% reduction.
- Editor DOM nodes: 519 → 244, a 53.0% reduction.
- Initial JavaScript transfer: 166,508 → 162,011 bytes, a 2.7% reduction.
- Desktop shell median: 152 → 132 ms, a 13.2% improvement.
- Pixel 7 shell median: 151 → 123 ms, an 18.5% improvement.
- Desktop chapter-ready median: 235 → 179 ms, a 23.8% improvement; p75 improved from 302 → 194 ms.
- Pixel 7 chapter-ready median: 220 → 178 ms, a 19.1% improvement; p75 improved from 226 → 179 ms.
- The A5 mobile fixture had no preview renderer mounted before the owner opened Preview lokal in all three samples.
- A5 telemetry reported an interactive-ready median of 148 ms on desktop and 147 ms on Pixel 7 for this isolated fixture.

## Validation gates

- `npm run audit:p0-a5:editor-runtime`
- strict payload parser and action tests
- invitation editor server/UI contracts
- invitation route contracts
- formatting, lint, TypeScript, full unit suite, production build
- general E2E, Invitation Experience, and Personal Response browser regressions
- twelve before/after production-runtime browser samples

All product, contract, build, and browser gates passed before the temporary runtime fixture and workflow were removed. The final clean head must retain the standard repository gates before owner lock or merge.
