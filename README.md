# Seraya

Seraya adalah fondasi produk untuk platform undangan pernikahan Indonesia yang self-serve, WhatsApp-first, dan tidak bergantung pada admin manual.

> `Seraya` adalah nama kerja sementara sampai validasi nama, domain, merek, dan handle selesai.

## Current implementation status

- **SRY-001** — Repository foundation: complete.
- **SRY-002** — Seraya design foundation: complete.
- **SRY-003** — Supabase database, migrations, and RLS baseline: complete (local Supabase CLI validation still requires Docker).
- **SRY-004** — Supabase Auth entry flow and protected dashboard shell: complete (full browser sign-in verification still requires local or hosted Supabase Auth).
- **SRY-005** — Secure wedding project setup flow and real project bootstrap overview: complete.
- **SRY-006** — Private versioned invitation draft contract and database safety guard: complete.
- **SRY-007** — Roselle private owner preview renderer: complete.
- **SRY-008** — Immutable published invitation snapshots and public Roselle runtime: complete.
- **SRY-009** — Private gallery media upload, owner preview proxy, and current-snapshot public media proxy: implementation candidate.
- **SRY-010** — Midtrans Snap hosted-redirect payment attempt foundation: implementation candidate.

## Stack

- Next.js App Router + TypeScript strict
- Tailwind CSS v4
- Vitest + Playwright
- Supabase PostgreSQL + Auth + RLS (SRY-003 foundation)
- Planned: Midtrans, QStash, Upstash Redis, Resend, Sentry

## Local development

### Requirements

- Node.js 22+
- npm 10+

### Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

For authentication UI, set the Supabase public URL and anon key in `.env.local`. In Supabase Auth URL Configuration, allow the exact callback path for each environment, for example `http://localhost:3000/auth/callback` locally and `https://your-domain.example/auth/callback` in production. Google must be enabled in the Supabase project before the Google button can complete sign-in.

For SRY-009 gallery upload and media proxy runtime, also set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. It is used only by server-side reserve/finalize/proxy services to access the private `invitation-media` bucket; never expose it in browser code or deploy it with a `NEXT_PUBLIC_` prefix.

For SRY-010 checkout setup, configure `MIDTRANS_ENVIRONMENT` (`sandbox` or `production`), `MIDTRANS_SERVER_KEY`, and a positive integer `SERAYA_INVITATION_ACTIVATION_PRICE_IDR`. The Server Key and price are read only on the server. Seraya uses the Midtrans Snap hosted redirect URL and does not treat the browser return as payment confirmation; verified webhook handling is intentionally deferred.

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

## Quality commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run check
```

## Supabase local workflow

Docker is required for full local Supabase services. The repository ships the Supabase CLI as a dev dependency, so no global install is required.

```bash
npm run supabase:start
npm run db:reset
npm run db:migration:list
npm run test:db
npm run db:types
```

Create a migration with `npm run db:migration:new -- m0009_descriptive_name`.
Generate remote schema types without committing a project reference: `npm run db:types -- --project-ref <YOUR_PROJECT_REF>`.

After local reset applies the latest migrations, run `npm run db:types` before parameterizing Supabase clients with the generated `Database` type. Do not add handwritten schema types as a substitute.

See `docs/sry-003-supabase-migration-foundation.md` for RLS boundaries, `docs/sry-005-create-wedding-project.md` for the M0004 setup contract, `docs/sry-006-invitation-draft-schema.md` for the M0005 draft contract, and `docs/sry-008-published-invitation-runtime.md` for the M0007 publication/runtime contract, and `docs/sry-009-media-foundation-gallery-runtime.md` for the M0008 private media boundary, and `docs/sry-010-payment-foundation-midtrans.md` for the M0009 checkout boundary.

`npm run e2e` is configured for Playwright and requires the Playwright Chromium browser binary to be installed locally.

## Repository guide

- `src/app` — App Router routes and layouts.
- `src/design-system` — Seraya tokens and reusable primitives.
- `src/modules` — future business-domain modules.
- `src/lib` — framework-neutral helpers.
- `docs` — implementation decisions and ticket notes.
- `supabase` — Supabase configuration, migrations, seed contract, and future SQL tests.
- `tests` — E2E and integration testing.

## Product boundaries

- Do not create user flows that require manual admin intervention.
- Do not expose guest data through public routes.
- Do not treat browser payment redirects as payment confirmation.
- Do not let templates own business logic.
- Keep public invitation runtime behavior separate from private dashboard behavior.

See `AGENTS.md` for repository-level implementation guidance.

### Midtrans webhook (SRY-011A)

Set `MIDTRANS_SERVER_KEY` only in the server environment, then point Midtrans Payment Notification URL to `POST /api/webhooks/midtrans`. Seraya verifies the SHA-512 notification signature before applying any payment state; browser return URLs remain informational and cannot mark a payment as paid.
