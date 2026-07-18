# Seraya Migration Ledger

This ledger lists migration files present in the current repository baseline. It records repository
migration availability, not whether a particular deployed environment has applied them.

**SRY-033 introduced no new migration.** SRY-037 adds M0018, SRY-038 adds M0019, and the P0 stabilization adds M0020. The current canonical repository range is M0001 through M0020.

| Migration | File                                                                                 | Confirmed purpose                                                                               | Status                     |
| --------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | -------------------------- |
| M0001     | `20260620000100_m0001_extensions_and_base_enums.sql`                                 | Required extensions and locked domain enums.                                                    | Present in locked baseline |
| M0002     | `20260620000200_m0002_profiles_and_ownership.sql`                                    | Auth-backed profiles and ownership/RLS foundation.                                              | Present in locked baseline |
| M0003     | `20260620000300_m0003_wedding_projects.sql`                                          | Owner-scoped wedding project foundation.                                                        | Present in locked baseline |
| M0004     | `20260620000400_m0004_add_project_setup_fields.sql`                                  | Required project setup facts for wedding-project creation.                                      | Present in locked baseline |
| M0005     | `20260620000500_m0005_add_invitation_drafts.sql`                                     | One private versioned invitation draft per active project.                                      | Present in locked baseline |
| M0006     | `20260620000600_m0006_enforce_invitation_draft_content_safety.sql`                   | Database guard that rejects literal raw HTML in invitation draft JSON.                          | Present in locked baseline |
| M0007     | `20260620000700_m0007_add_published_invitation_snapshots.sql`                        | Immutable public-safe published invitation snapshots and publication foundation.                | Present in locked baseline |
| M0008     | `20260620000800_m0008_add_media_assets_and_private_storage_foundation.sql`           | Private media assets and storage foundation for gallery runtime.                                | Present in locked baseline |
| M0009     | `20260620000900_m0009_add_payment_transactions_foundation.sql`                       | Payment transaction attempt foundation.                                                         | Present in locked baseline |
| M0010     | `20260620001000_m0010_add_payment_webhook_events_and_verified_state_transitions.sql` | Verified payment-webhook ledger and trusted status transitions.                                 | Present in locked baseline |
| M0011     | `20260621001100_m0011_enforce_payment_gated_publication.sql`                         | Verified activation payment requirement inside publication authority.                           | Present in locked baseline |
| M0012     | `20260621001200_m0012_add_guest_manager_foundation.sql`                              | Owner-scoped private guest-list foundation.                                                     | Present in locked baseline |
| M0013     | `20260621001300_m0013_add_personal_guest_links_and_rsvp.sql`                         | Private bearer guest links and personal RSVP capability foundation.                             | Present in locked baseline |
| M0014     | `20260621001400_m0014_add_guest_whatsapp_contact_foundation.sql`                     | Optional private owner-managed guest WhatsApp contact field.                                    | Present in locked baseline |
| M0015     | `20260624001500_m0015_add_invitation_template_gallery_and_runtime.sql`               | Invitation template key, gallery, and runtime compatibility foundation.                         | Present in locked baseline |
| M0016     | `20260625001600_m0016_add_guestbook_ucapan_doa.sql`                                  | Private-by-design personal Guestbook / Ucapan & Doa foundation.                                 | Present in locked baseline |
| M0017     | `20260626001700_m0017_add_rsvp_attendance_party_count.sql`                           | Private explicit RSVP attendee count separate from invited party size.                          | Present in locked baseline |
| M0018     | `20260627001800_m0018_add_delivery_batch_personal_link_guard.sql`                    | Atomic server-only create-if-no-active-link guard for batch personal-link preparation.          | Present in baseline        |
| M0019     | `20260627001900_m0019_add_owner_safe_guest_link_reaccess.sql`                        | Encrypted, versioned server-only capability material for owner re-access of new personal links. | Present in canonical main |
| M0020     | `20260718084331_m0020_add_postgrest_safe_guest_link_authority.sql`                   | Short PostgREST-safe wrapper for atomic encrypted batch personal-link creation.                 | Present in canonical main |

Do not add, reorder, rewrite, or patch migrations merely to support documentation work. Migration
state for a deployed environment must be verified in that environment separately.

## Remote migration-history baseline repair

On 2026-07-18, the `seraya-dev` migration history was aligned with the canonical repository after a structural audit confirmed M0001 through M0020 were already represented by database objects and policies. M0001 through M0019 were marked applied without replaying their SQL; M0020 was already tracked under version `20260718084331`. The remote history now contains the same 20 timestamped versions as this ledger.

The original remote M0020 history statement still contains the former `SRY-043` comment and is intentionally retained as audit evidence. The repository label is corrected to P0 stabilization because `SRY-043` remains reserved for Cross-Workspace Mental Load Reduction Layer V1. See `docs/SUPABASE_MIGRATION_BASELINE_REPAIR.md` for the repair evidence and forward workflow.

## M0020 stabilization statement

The P0 stabilization adds M0020. It preserves M0019's validation, locking, and capability-storage authority while exposing it through a PostgreSQL identifier shorter than the 63-byte limit. The wrapper is server-only and does not expand anonymous or authenticated access.

## SRY-038 migration statement

The SRY-038 candidate adds M0019. It preserves `token_hash` as the public authorization contract and adds nullable encrypted capability material only for new or explicitly replaced owner links. Legacy hashed-only links remain active and require explicit replacement to become owner-recoverable.

## SRY-037 migration statement

SRY-037 adds M0018. It does not alter M0001 through M0017, table schema, RLS, or public capability contracts. M0018 only adds a server-only database function used to preserve an existing active personal link during concurrent batch preparation.
