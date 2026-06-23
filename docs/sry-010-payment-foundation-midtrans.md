# SRY-010 — Payment Foundation & Midtrans Snap Adapter V1

## Boundary

SRY-010 creates a server-owned payment-attempt record and Midtrans Snap hosted redirect only. A browser return page is informational and never marks a payment paid. SRY-011 is the planned verified webhook authority for payment status transitions.

## Environment

```env
MIDTRANS_ENVIRONMENT=sandbox
MIDTRANS_SERVER_KEY=
SERAYA_INVITATION_ACTIVATION_PRICE_IDR=
```

The server key and price stay server-only. The price is parsed as a positive integer IDR amount; no UI input or query parameter can set it.

## Checkout flow

1. Server verifies the authenticated project owner.
2. M0009 reserves one active `created`/`pending` attempt per project/product.
3. Server calls Midtrans Snap with Basic Auth and an opaque `sry-pay-{uuid}` order ID.
4. The adapter validates the HTTPS Midtrans redirect host before the server action redirects.
5. The payment becomes `pending`; the return page only says confirmation is pending.

## Future webhook seam

M0009 allows only `created → pending` and `created → failed` for this release. `paid`, `expired`, `cancelled`, and `refunded` remain reserved for a future verified webhook migration.
