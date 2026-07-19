# Supabase Migration Baseline Repair

## Scope

- Date: 2026-07-18
- Supabase target: `seraya-dev` (`uvgvuzhsdabjnykuevwx`)
- Canonical source: `baktipra/seraya` on `main`
- Canonical migration range: M0001 through M0020

This record documents a migration-history alignment. It does not introduce product-schema DDL.

## Preconditions and evidence

The repository contained 20 timestamped migration files, while the remote migration-history table tracked only M0020. Before repair, a migration-by-migration structural audit verified the extensions, enums, tables, columns, functions, triggers, constraints, indexes, RLS policies, storage bucket, and privileges expected by M0001 through M0020. All 20 checks passed.

A pre-repair product-schema fingerprint was recorded:

| Surface            | MD5                                |
| ------------------ | ---------------------------------- |
| Public columns     | `4c2cb3a51ea9a0d8a43d5a6580e0f0c3` |
| Public constraints | `13e8fe78c148342d7b14324907180331` |
| Public functions   | `8ad27f954cb18a516312c45096b969f6` |
| Public indexes     | `03d41b2233098501e8d346410d15e474` |
| Public policies    | `71dbe8ed14fefa80b570bac34a3196e1` |
| Public triggers    | `97b332cf889a3adc6f82b8cf1b373848` |
| Storage buckets    | `4988888806c90d36be0d43a332f89bc`  |

## Repair performed

M0001 through M0019 were marked applied in `supabase_migrations.schema_migrations` in one transaction. Their SQL files were not replayed. Each repair row carries:

- `created_by = 'migration repair'`
- a statement marker saying schema evidence was verified and SQL was not replayed
- the exact timestamp and migration name from the canonical repository

M0020 was already tracked under version `20260718084331`; its original history row and applied statement were left unchanged. The repair transaction wrote only to the Supabase migration-history table, not to product tables, application data, the public schema, or storage configuration. This follows the semantics of marking an existing migration as applied with [Supabase migration repair](https://supabase.com/docs/reference/cli/supabase-migration-repair).

## Verification

After repair:

- the remote history contains exactly 20 canonical versions, M0001 through M0020
- 19 rows carry the baseline-repair marker
- the original M0020 row remains distinct and preserved
- the earliest and latest versions are `20260620000100` and `20260718084331`
- the hosted Supabase smoke passed against the M0020 merge commit

The original remote M0020 statement contains the former `SRY-043` comment. It is preserved as historical evidence. The repository comment is corrected to P0 stabilization because `SRY-043` remains reserved for Cross-Workspace Mental Load Reduction Layer V1.

## Forward migration workflow

1. Add every schema change as a new timestamped file under `supabase/migrations`; never edit an applied migration's executable SQL.
2. Review and test the migration in a disposable or local environment before touching the shared project.
3. Merge the migration file through GitHub before or together with applying that exact version.
4. Apply DDL through Supabase migration tooling, then verify the tracked remote version matches the repository filename.
5. Run database integration tests, security/performance advisors when relevant, and the hosted smoke gate.
6. Record exceptional history repairs with structural evidence; never replay historical DDL merely to fill missing history rows.
