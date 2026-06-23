# SRY-003 — Supabase & Migration Foundation

## Scope delivered

- Supabase local configuration and seed contract.
- Three ordered SQL migrations for extensions/enums, profiles, and wedding-project ownership.
- Server/browser/admin Supabase client boundaries.
- Auth-backed profile trigger, timestamp triggers, RLS policies, explicit table grants, and soft-delete-safe project access.
- Repeatable generated database type command.
- Database-backed RLS integration verification using a PostgreSQL-compatible PGlite runtime when Docker-backed Supabase local services are unavailable.

## Migrations

1. `20260620000100_m0001_extensions_and_base_enums.sql`
   - Enables `pgcrypto` in `extensions`.
   - Adds locked `project_status`, `payment_status`, `guest_link_status`, `rsvp_status`, `media_status`, `guestbook_status`, and `publish_version_status` contracts.
2. `20260620000200_m0002_profiles_and_ownership.sql`
   - Adds `public.profiles`, an `auth.users` creation trigger, `updated_at` handling, RLS, and narrow authenticated grants.
   - `id` and `email` come from `auth.users`; only `display_name` is directly updatable by the owner.
3. `20260620000300_m0003_wedding_projects.sql`
   - Adds project ownership, globally unique lowercase slugs, `Asia/Jakarta` default timezone, `draft` status, timestamps, and `deleted_at`.
   - RLS restricts every record to its `auth.uid()` owner; the server repository applies `deleted_at is null` as the default active-project scope.
   - No authenticated `DELETE` grant exists; soft deletion is an owner-only `UPDATE` of `deleted_at`.

## Local workflow

Prerequisites: Node 22+, npm 10+, Docker Desktop/Engine running, and the Supabase CLI installed through this repository.

```bash
npm ci
cp .env.example .env.local
npm run supabase:start
npm run db:reset
npm run db:migration:list
npm run test:db
npm run db:types
```

Create a new migration:

```bash
npm run db:migration:new -- m0004_descriptive_name
```

Apply/reset local migrations from a clean local database:

```bash
npm run db:reset
```

Run the Supabase SQL test suite if SQL tests are added later:

```bash
npm run db:test
```

Stop local services:

```bash
npm run supabase:stop
```

## Generated TypeScript types

`npm run db:types` generates schema-derived output at:

```text
src/server/supabase/database.types.ts
```

By default it targets local Supabase (`supabase gen types typescript --local --schema public`). No inaccurate handwritten database type file is committed in this ticket.

**TODO after generation:** after `npm run db:types` creates `database.types.ts`, import the generated `Database` type in `src/server/supabase/types.ts` and parameterize the shared `SerayaSupabaseClient` alias as `SupabaseClient<Database>`. Browser, server, and admin client helpers consume that alias. This stays a documented follow-up because SRY-003 must build before local or cloud Supabase credentials/services are available.

For a linked/authorized cloud project, generate without hardcoding a project ref in the repository:

```bash
npm run db:types -- --project-ref <YOUR_PROJECT_REF>
```

This can require `supabase login` or a `SUPABASE_ACCESS_TOKEN` supplied only in the local shell/CI environment.

## Verification coverage

`tests/integration/supabase-foundation.test.ts` applies the repository migrations to a PostgreSQL-compatible runtime and verifies:

- profile trigger behavior, including missing metadata;
- User A can read/update only User A profile;
- User A can create/read/update/soft-delete only User A projects;
- User A cannot create a project for User B, update User B data, or hard-delete projects;
- unauthenticated project reads are denied;
- project slugs are globally unique.

The test harness removes only M0001's `pgcrypto` extension statement because PGlite does not bundle PostgreSQL contrib extensions. All ownership tables, triggers, grants, RLS policies, indexes, and constraints run as migration SQL against a real PostgreSQL-compatible engine. `supabase db reset` remains the authoritative full local-Supabase validation command and requires Docker.
