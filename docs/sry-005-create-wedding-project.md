# SRY-005 — Create Wedding Project

## Scope delivered

- Activates the authenticated dashboard empty-state action at `/dashboard/new`.
- Adds a minimal couple setup form for two display names, primary event date, event city, and invitation slug.
- Creates a project through a server action using the authenticated Supabase user id only.
- Adds a real launcher list to `/dashboard` for active, owned projects.
- Replaces the project overview placeholder with a narrow bootstrap overview containing only stored project facts.
- Keeps invitation completion explicitly disabled as a later-ticket feature.

## M0004 — Project setup fields

`20260620000400_m0004_add_project_setup_fields.sql` adds only:

```text
person_one_name
person_two_name
event_city
```

Each is non-null, must be trimmed, and is constrained against blank values. The migration grants `INSERT` on precisely those three new user-writable columns to `authenticated`; it does not grant client control over `account_id`, `status`, or soft-delete ownership.

A newly created row relies on locked M0003 defaults:

```text
status                  = draft
default_timezone        = Asia/Jakarta
selected_template_id    = null
selected_theme_preset_id = null
deleted_at              = null
```

M0004 itself introduces no invitation draft, template, event detail, guest, payment, or media table. The later M0005 draft boundary is documented in `docs/sry-006-invitation-draft-schema.md`.

## Server creation boundary

1. `ProjectSetupForm` sends standard `FormData` to `createProjectAction`.
2. `createProjectSchema` validates the exact setup shape with Zod.
3. `createProjectForCurrentUser` gets the account identity from `requireCurrentUser()`; no form field is accepted for `account_id`.
4. `createWeddingProject` uses a single atomic PostgreSQL `INSERT` and relies on database defaults for lifecycle state and timezone. Since M0005, its database trigger also creates the default invitation draft in that same transaction.
5. The existing globally unique slug index handles concurrent requests. PostgreSQL unique error `23505` is mapped to the human-safe link message.
6. Success redirects only to `/dashboard/[projectId]` returned by the owned insert.

## Slug contract

- Suggested from the two supplied names.
- Lowercase kebab-case only.
- Reserved route words are rejected before insertion.
- Global uniqueness is enforced by the existing database index.
- Collision errors never expose a raw PostgreSQL constraint message.

## Read and ownership behavior

- Project pages re-run `getOwnedProjectById(projectId, user.id)` server-side after the SRY-004 protected dashboard layout.
- The helper applies `account_id` and `deleted_at IS NULL` in addition to RLS.
- The dashboard project launcher uses `listOwnedActiveProjects`, which scopes every default list to active rows only.
- Unknown, cross-account, and soft-deleted projects return the normal not-found behavior without metadata leakage.

## Generated type workflow after M0004/M0005

M0004 and M0005 change the active schema. Once local Supabase or a permitted cloud project is available:

```bash
npm run supabase:start
npm run db:reset
npm run db:types
```

The last command writes `src/server/supabase/database.types.ts`. Then update the documented `SerayaSupabaseClient` alias to `SupabaseClient<Database>` using the generated `Database` export. Do not create or commit handwritten table types as a substitute when type generation cannot run.

For a cloud project, keep its reference out of the repository:

```bash
npm run db:types -- --project-ref <YOUR_PROJECT_REF>
```

## Verification coverage

- Zod required-field, invalid-date, reserved-slug, and canonical-slug checks.
- Server action field-error, duplicate-slug, and success redirect behavior.
- Server-owned account id service mapping.
- Proxy protection for `/dashboard/new` for anonymous and authenticated requests.
- Dashboard empty CTA, launcher cards, and project overview surfaces.
- PostgreSQL-compatible migration/RLS checks for setup field constraints, default `draft` / `Asia/Jakarta`, cross-account insert denial, global slug uniqueness, user-scoped reads, and soft-delete list exclusion.

## Local limits

`npm run test:db` uses the repository PGlite/PostgreSQL-compatible harness and runs without Docker. The following still require a running local Supabase stack and Docker:

```bash
npm run db:reset
npm run db:migration:list
npm run db:types
```
