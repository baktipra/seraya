# SRY-006 — Invitation Draft Schema

## Scope delivered

- Adds one private, versioned `invitation_drafts` JSONB document per wedding project.
- Creates the first draft through a PostgreSQL trigger when `wedding_projects` is inserted.
- Keeps project identity/lifecycle in `wedding_projects` and unfinished invitation content in one draft document.
- Makes the existing project overview show only factual draft readiness, without an invitation editor or raw JSON exposure.

## M0005 — Add invitation drafts

`20260620000500_m0005_add_invitation_drafts.sql` creates `public.invitation_drafts` with:

```text
id
project_id
schema_version = 1
content JSONB
created_at
updated_at
deleted_at
```

Database guards:

- `project_id` has a cascading foreign key to `wedding_projects`.
- `schema_version >= 1`.
- `content` must be a JSON object.
- A partial unique index allows exactly one active (`deleted_at IS NULL`) draft per project.
- `updated_at` reuses the existing Seraya timestamp trigger.

The migration adds an `AFTER INSERT` trigger on `wedding_projects`. It writes the default draft inside the same PostgreSQL transaction as the project insert. If draft creation fails, the project insert is rolled back.

## V1 JSON content contract

`src/modules/invitations/invitation-draft.schema.ts` defines a strict Zod contract with only these top-level sections:

```text
meta
hero
couple
story
events
location
gallery
rsvp
closing
```

The contract trims strings, converts optional blank strings to `null`, rejects raw HTML-like tags, has explicit text limits, accepts only HTTPS URLs, validates date-only values as `YYYY-MM-DD`, validates time values as `HH:mm`, limits gallery values to UUIDs, and rejects unknown object keys. The record wrapper requires `schemaVersion: 1`.

## Default mapping

The database trigger creates:

```text
couple.personOne.displayName = person_one_name
couple.personTwo.displayName = person_two_name
events.primaryDate           = event_date_primary
meta.timezone                = default_timezone
hero.title                   = "{person one} & {person two}"
hero.eyebrow                 = "The Wedding Of"
rsvp.enabled                 = true
gallery.imageIds             = []
```

Unfinished story, location, closing, ceremony, and reception fields are `null` or disabled. No synthetic story, venue, parent, photo, or event-time data is created.

## Ownership and read path

RLS derives draft ownership through the active parent project:

```text
wedding_projects.account_id = auth.uid()
wedding_projects.deleted_at IS NULL
```

Authenticated owners can read own drafts, insert only for an active own project, and update an active own draft including soft deletion. Normal repository reads always add `deleted_at IS NULL`, while ownership remains the RLS boundary so an owner can complete a soft-delete update safely. Anonymous access and cross-account read/update/insert are denied. No hard-delete privilege is granted.

`getOwnedProjectInvitationOverview(projectId)` gets the current user, verifies the project through `getOwnedProjectById`, then queries the active draft with the verified project record. A missing or soft-deleted draft returns a safe recovery state; a missing/foreign/soft-deleted project stays a normal not-found route.

## Generated type workflow after M0005

M0005 changes the active schema. Once local Supabase or an approved cloud project is available:

```bash
npm run supabase:start
npm run db:reset
npm run db:types
```

The command generates `src/server/supabase/database.types.ts`. Then follow the existing TODO in `src/server/supabase/types.ts` to parameterize `SerayaSupabaseClient` as `SupabaseClient<Database>`. Do not add handwritten table types when generated types cannot run.

## Verification coverage

- Default draft creation, one-active-draft constraint, and transaction rollback on draft-trigger failure.
- PostgreSQL-compatible RLS checks for own/cross-account/anonymous draft access and soft-delete read exclusion.
- Zod contract checks for all required invalid cases and default normalization.
- Overview rendering for active draft readiness and safe missing-draft recovery.

## Local limits

`npm run test:db` uses PGlite and applies all repository migrations. Full Supabase commands still require Docker:

```bash
npm run db:reset
npm run db:migration:list
npm run db:types
```
