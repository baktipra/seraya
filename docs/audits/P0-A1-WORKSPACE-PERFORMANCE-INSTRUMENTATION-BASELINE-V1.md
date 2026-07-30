# P0-A1 — Workspace Performance Instrumentation & Baseline V1

Status: Implemented / validated / baseline captured  
Program: Issue #37 — P0 Workspace Performance & Invitation Layout Recovery  
Base: `41dfe86872c0346792583fe68802a48b632cf8aa`

## Objective

Establish repeatable evidence for the reported slow owner-workspace navigation before changing caching, prefetch, data boundaries, query composition, or editor runtime behavior.

This slice is observational. It does not claim a performance improvement.

## Infrastructure finding

- Supabase project region: Singapore (`ap-southeast-1`).
- Vercel production and preview functions use Singapore (`sin1`).
- The primary bottleneck is therefore application request and render architecture, not long-distance database placement.

## Static baseline

### Navigation

- Five canonical destinations remain Ringkasan, Undangan, Tamu, Bagikan, and Respons Tamu.
- Their shared `Link` component explicitly uses `prefetch={false}`.
- P0-A1 preserves that condition so the baseline is not mixed with P0-A2 navigation repair.

### Route caching policy

The canonical owner pages remain dynamic private-data surfaces:

| Workspace | `force-dynamic` | `revalidate = 0` | `force-no-store` |
| --- | --- | --- | --- |
| Ringkasan | Yes | Yes | Yes |
| Undangan | Yes | Yes | Yes |
| Tamu | Yes | No explicit value | No explicit value |
| Bagikan | Yes | Yes | Yes |
| Respons Tamu | Yes | Yes | Yes |

These policies are not changed by A1.

### Shared readiness cost

`getWeddingReadinessAggregateCountsForVerifiedProject()` currently issues nine parallel PostgREST operations:

1. active guest count;
2. WhatsApp-available guest count;
3. non-pending RSVP count;
4. attending RSVP count;
5. declined RSVP count;
6. attending-party values;
7. active personal-link count;
8. active Guestbook count;
9. delivery-readiness link rows.

The shared project layout requests full readiness for project identity and status. Destination pages can then request readiness or owner context again. Production API logs observed before A1 showed these project, draft, publication, payment, guest, link, and Guestbook batches repeating in short intervals during workspace activity.

## Client instrumentation

A canonical menu activation records a private, session-scoped transition marker containing only:

- normalized source pathname;
- normalized destination pathname;
- destination workspace kind;
- generated navigation ID;
- monotonic and epoch start timestamps.

When the destination `WorkspacePage` commits and reaches the next animation frame, the probe emits:

```json
{
  "level": "info",
  "source": "workspace-performance",
  "event": "workspace_transition_ready",
  "navigation_mode": "client",
  "total_ms": 0,
  "rsc_request_count": 0,
  "rsc_transfer_bytes": 0,
  "rsc_duration_ms": 0,
  "workspace": "studio"
}
```

The values above illustrate the metric shape, not a measured result.

The same payload is dispatched through `seraya:workspace-performance`, allowing browser automation to capture it without scraping console text.

Dynamic project paths are normalized to `/dashboard/:projectId/...`. No account ID, project ID, guest ID, token, invitation content, or personal response data is logged. Metric-storage failure cannot block navigation.

## Server instrumentation

Structured server events time:

- shared project-shell readiness;
- Ringkasan readiness;
- complete Undangan editor-screen preparation;
- Tamu manager preparation;
- Bagikan delivery-screen preparation;
- Respons Tamu response-screen preparation;
- the nine-query shared-readiness aggregate batch.

Example shape:

```json
{
  "level": "info",
  "source": "workspace-performance",
  "event": "workspace_server_load",
  "workspace": "shared-readiness",
  "operation": "aggregate-query-batch",
  "minimum_query_count": 9,
  "duration_ms": 0,
  "status": "success"
}
```

No resource identifier or source payload participates in these logs.

## Repeatable audit

Run:

```bash
npm run audit:p0-a1:workspace-performance
```

The audit verifies:

- exactly five canonical workspace destinations;
- navigation-start instrumentation;
- workspace-ready instrumentation;
- the preserved prefetch-off baseline;
- nine readiness repository queries;
- server timing around that query batch;
- dynamic/cache-policy inventory for the five destination routes.

The audit is also executed by the focused unit contract.

## Authenticated transition matrix

The first matrix was captured from frozen preview application SHA `58433f37b53625f280af2991002625fd978592d2` using Desktop Chrome and Pixel 7 profiles.

Method:

- one unrecorded complete warm-up cycle per device;
- three recorded warm client-navigation cycles for all five transitions;
- 30 recorded measurements total;
- route and project identifiers redacted.

Overall results:

| Device | Median | P75 | Minimum | Maximum |
| --- | ---: | ---: | ---: | ---: |
| Desktop | 953 ms | 1049.5 ms | 616 ms | 1164 ms |
| Mobile | 938 ms | 1052 ms | 740 ms | 1505 ms |

The slowest path is `Tamu → Bagikan`:

- desktop median 1134 ms and p75 1149 ms;
- mobile median 1305 ms and p75 1405 ms.

Every transition used one small RSC response—approximately 1.7–2.9 KB—but RSC duration consumed nearly the complete client-observed time. The evidence therefore points to server loader and data-boundary cost rather than transfer size.

The Pixel 7 run also proved that workspace content can intercept pointer events above the fixed bottom navigation. The final timing collection used a forced click only inside the temporary measurement workflow so the defect remained visible as evidence rather than being silently changed in A1.

The complete per-transition table and methodology are recorded in:

`docs/audits/P0-A1-AUTHENTICATED-WORKSPACE-TRANSITION-MATRIX-V1.md`

## Validation

- repository formatting: PASS;
- lint: PASS;
- TypeScript: PASS;
- full unit suite: PASS;
- repeatable P0-A1 audit: PASS;
- production build: PASS;
- general E2E: PASS;
- Release A flagship regression: PASS;
- invitation-experience regression: PASS;
- personal-response regression: PASS;
- authenticated desktop/mobile matrix: PASS;
- frozen Vercel preview deployment: READY;
- preview runtime error/warning/fatal scan: clear.

## A1 exit criteria

- instrumentation is present on all five destinations: PASS;
- structured events contain no sensitive identifiers: PASS;
- baseline audit passes: PASS;
- existing automated gates remain green: PASS;
- authenticated transition matrix is recorded: PASS;
- baseline exposes actionable A2/A3 priorities: PASS.

## Preserved boundaries

- no prefetch behavior change;
- no cache-policy change;
- no database schema, migration, index, RLS, or policy change;
- no query consolidation;
- no editor rendering or save-state change;
- no publication, payment, guest-link, RSVP, or Guestbook semantic change;
- no public or personal invitation presentation change.

## Recommended next slice

P0-A2/A3 should restore intentional prefetch, provide immediate pending feedback, repair mobile bottom-navigation stacking, replace full readiness in the shared layout with a lightweight project-shell data boundary, and reuse already verified project context inside destination loaders.
