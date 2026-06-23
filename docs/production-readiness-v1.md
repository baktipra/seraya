# Production readiness V1

## Configuration

`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public configuration values. `SUPABASE_SERVICE_ROLE_KEY`, `MIDTRANS_SERVER_KEY`, and `SERAYA_INVITATION_ACTIVATION_PRICE_IDR` are server-only; never use a `NEXT_PUBLIC_` prefix for secrets. `MIDTRANS_ENVIRONMENT` is exactly `sandbox` or `production`. Production requires an HTTPS `NEXT_PUBLIC_APP_URL`.

## Deployment checks

- Apply and verify all existing Supabase migrations before deploy; run the repository DB checks against the target-compatible schema.
- Configure a publicly reachable HTTPS `POST /api/webhooks/midtrans` endpoint.
- Smoke test dashboard login, a public snapshot invitation, private guest link no-store headers, private CSV export headers, private/public media boundaries, and a sandbox payment attempt.
- A browser payment return page is **not payment proof**. Only the verified webhook transition is authoritative.
- A paid webhook does **not** auto-publish. Publishing remains a separate owner action after verified payment.
- A guest-link token is shown once only and is secret bearer data. Treat guest CSV exports/imports as private personal data.

## Release checklist

Pass: required placeholders are set in deployment secrets; production app URL is HTTPS; webhook endpoint reachable; migrations verified; `npm run format:check`, `npm run lint`, `npm run typecheck`, tests, and build reviewed; artifacts exclude local env/cache files. Fail deployment if a secret is public, a route cache contract changes, or private data appears in logs/errors.
