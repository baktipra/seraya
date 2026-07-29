# P0-A1 — Workspace Performance Instrumentation & Baseline V1

Status: Implemented / validation pending  
Program: Issue #37 — P0 Workspace Performance & Invitation Layout Recovery  
Base: `41dfe86872c0346792583fe68802a48b632cf8aa`

## Objective

Establish repeatable evidence for the reported slow owner-workspace navigation before changing caching, prefetch, data boundaries, query composition, or editor runtime behavior.

This slice is observational. It does not claim a performance improvement.

## Infrastructure finding

- Supabase project region: Singapore (`ap-southeast-1`).
- Vercel production region: Singapore.
- The initial bottleneck hypothesis is therefore application request and render architecture, not long-distance database placement.

## Static baseline

### Navigation

- Five canonical destinations remain Ringkasan, Undangan, Tamu, Bagikan, and Respons Tamu.
- Their shared `Link` component still explicitly uses `prefetch={false}`.
- P0-A1 preserves that condition so the baseline is not mixed with the P0-A2 navigation repair.

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

A canonical menu click now records a private, session-scoped transition marker containing only:

- source pathname;
- destination pathname;
- destination workspace kind;
- generated navigation ID;
- monotonic and epoch start timestamps.

When the destination `WorkspacePage` commits and reaches the next animation frame, the probe emits a structured browser-console event:

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

The values above are field examples, not measured results.

The same payload is dispatched as the browser event `seraya:workspace-performance`, allowing Playwright or a temporary manual collector to capture it without scraping console text.

No account ID, project ID, guest ID, token, invitation content, or personal data is logged.

## Server instrumentation

Structured server events now time:

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
- dynamic/cache policy inventory for the five destination routes.

## Measurement matrix

After deployment, collect at least three warm transitions in each direction on desktop and mobile for:

- Ringkasan → Undangan;
- Undangan → Tamu;
- Tamu → Bagikan;
- Bagikan → Respons Tamu;
- Respons Tamu → Ringkasan.

For each transition record:

- client total milliseconds;
- RSC request count;
- RSC transfer bytes;
- RSC request duration;
- project-shell server duration;
- destination loader server duration;
- shared-readiness batch count and duration.

Use median and p75 values. First-load authentication and a deliberate hard refresh must be recorded separately from warm client navigation.

## A1 exit criteria

- instrumentation is present on all five destinations;
- structured events contain no sensitive identifiers;
- the baseline audit passes;
- formatting, lint, TypeScript, unit tests, build, and existing browser regression remain green;
- preview runtime logs show the expected metric shape without new application errors;
- the first authenticated transition matrix is documented before P0-A2 changes navigation behavior.

## Preserved boundaries

- no prefetch behavior change;
- no cache-policy change;
- no database schema, migration, index, RLS, or policy change;
- no query consolidation;
- no editor rendering or save-state change;
- no publication, payment, guest-link, RSVP, or Guestbook semantic change;
- no public or personal invitation presentation change.

## Recommended next slice

P0-A2/A3 should use the captured evidence to restore intentional prefetch and replace full readiness in the shared layout with a lightweight project-shell data boundary. It must not begin until the initial transition matrix has been captured from this baseline.
