# P0-A4 — Readiness Aggregation Recovery V1

Status: Implementation complete / authenticated cold-load validation in progress  
Program: Issue #37 — P0 Workspace Performance & Invitation Layout Recovery  
Base: `9d04e3b75cf0f0ec62228472e61be95fb7612800`

## Objective

Reduce private owner-workspace cold-load and hard-refresh work after P0-A2/A3 made warm prefetched navigation effectively immediate.

A4 preserves the existing readiness DTO and all authorization, publication, payment, guest-link, RSVP, Guestbook, and delivery semantics. It changes only how the aggregate facts are loaded and which readiness boundary each route requests.

## Baseline

Before A4, full wedding readiness performed:

- active draft;
- current publication;
- verified activation payment;
- nine aggregate PostgREST operations.

The aggregate batch separately queried active guests, WhatsApp availability, three RSVP counts, attendee scalar values, active personal links, active Guestbook entries, and delivery-readiness link rows.

The invitation editor consumed only `identity` and `invitation`, but still requested the complete readiness object, including every guest, RSVP, Guestbook, and delivery aggregate. It also loaded its active draft independently, causing the draft to be queried twice in the same screen preparation.

## Recovered boundaries

### Invitation-only readiness

`getInvitationReadinessForVerifiedProject()` now composes only:

- active draft;
- current publication;
- verified activation payment;
- identity and invitation state.

The invitation editor passes its already-loaded active draft into this boundary. Therefore the screen does not query that draft twice and does not load operational aggregates it never renders.

### Full project-compass readiness

`getWeddingReadinessForVerifiedProject()` now composes two explicit boundaries in parallel:

1. invitation-only readiness;
2. operational aggregate counts.

The returned `WeddingReadinessV1` shape and primary-action derivation remain unchanged.

## Aggregate repository recovery

The typical aggregate batch is reduced from nine PostgREST operations to three projections:

1. one paginated owner-scoped active-guest scalar projection containing only `id`, `whatsapp_phone_e164`, `rsvp_status`, and `rsvp_attendee_count`;
2. one paginated admin-scoped guest-link projection joined only to active project guests;
3. one exact active Guestbook count.

The server reducer derives:

- active guest count;
- WhatsApp available count;
- non-pending, attending, and declined RSVP counts;
- confirmed attendee total;
- active personal-link count;
- ready-to-distribute, missing-WhatsApp, link-update, and no-personal-invitation counts.

Guest and link projections use explicit 1,000-row pages. This avoids silently inheriting the Data API default row ceiling while retaining bounded scalar payloads.

## Expected request reduction

For a typical project below one page:

- operational aggregate batch: **9 → 3** PostgREST operations;
- full readiness composition: **12 → 6** operations;
- invitation editor readiness path, excluding owner verification and gallery resolution: **13 → 3** operations because operational aggregates and the duplicate draft read are removed.

Projects larger than one page add only the required guest or link pagination requests rather than truncating aggregate facts.

## Security and semantic boundaries

- no schema or migration change;
- no RLS or policy change;
- no cross-request private cache;
- no raw guest rows, phone numbers, link material, payment detail, Guestbook content, or snapshot JSON enters the readiness DTO;
- no `token_hash` is selected;
- current publication and payment authorities remain unchanged;
- current personal-link and delivery-readiness derivation remains based on active guests and latest link state;
- query failures remain generic to the browser and safely redacted in server diagnostics.

## Validation contract

Run:

```bash
npm run audit:p0-a4:readiness
```

The audit verifies:

- exactly three static readiness projections;
- explicit guest and link pagination;
- invitation editor uses invitation-only readiness;
- the active draft is reused;
- full readiness composes invitation and operational boundaries in parallel.

Final acceptance additionally requires formatting, lint, TypeScript, full tests, production build, browser regressions, a READY preview, runtime error scan, and authenticated cold-load evidence.
