# Seraya Baseline Ledger

## Purpose

This ledger is the canonical repository reference for Seraya implementation baselines, release
status, and source-of-truth rules. It is a governance record, not a deployment record.

## Source-of-truth rule

1. The latest **full ZIP explicitly marked Locked** by Command Center is the implementation source
   of truth.
2. Current governance status overrides older README text, historical ticket notes, Git branches,
   and deployments.
3. A `changed-files-only` ZIP is a delta reference only. It is **not** a standalone baseline and
   must be reconstructed against its named full baseline.
4. Source code describes the runtime currently packaged in a baseline; it does not by itself grant
   a release Locked status.
5. This ledger records evidence available in the locked baseline and governance history. It does
   not invent deployment, production-migration, or validation facts that are not evidenced.

## Current authoritative baseline

| Field             | Record                                                               |
| ----------------- | -------------------------------------------------------------------- |
| Baseline          | **SRY-033 Generic–Personal Composition Correction V1**               |
| Status            | **Accepted / Locked with deferred validation**                       |
| Full ZIP          | `seraya-sry-033-generic-personal-composition-correction-v1-full.zip` |
| SHA-256           | `64d57de2f86c33dfa45177384786a9a1d1a3a97486f89b7069e6e033e2fe0d79`   |
| Previous baseline | SRY-032 Invitation Composition Foundation V1 — **Superseded**        |
| Migration impact  | No new migration; repository remains M0001 through M0017             |

### Locked SRY-033 scope

- Generic and Preview invitation surfaces have no RSVP or Guestbook response shell.
- A generic RSVP-enabled invitation may render at most one quiet, noninteractive response note.
- Personal greeting, RSVP, and Guestbook are composed through authorized personal slots.
- Roselle, Aruna, and Laras own the personal response composition and presentation rhythm.
- `InvitationViewModel` remains public invitation content only.

### SRY-033 release validation record

The following evidence completed successfully for SRY-033:

- Source scope audit: passed; no scope regression found.
- Format, lint, and typecheck: passed.
- PGlite database integration: passed, 41/41 tests.
- Canonical full suite: passed, 495/495 tests.
- Production build: passed, including static generation 6/6.

**Deferred validation:** Controlled Supabase-backed HTTP runtime smoke was not completed in the
audit sandbox.

Deferred does **not** mean passed. Deferred does **not** mean a known source defect exists.

A controlled non-production Supabase-backed runtime smoke must be completed before a future
higher-risk release affecting authentication, guest-link authorization, public-route caching,
database/runtime infrastructure, or equivalent high-risk runtime behavior.

## Baseline chain

| Release  | Status                                     | Confirmed scope or reason                                                                                 |
| -------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| SRY-001  | Locked                                     | Repository initialization and working project foundation.                                                 |
| SRY-002  | Locked                                     | Design foundation.                                                                                        |
| SRY-003  | Locked                                     | Supabase migration, ownership, and RLS foundation (M0001–M0003).                                          |
| SRY-004  | Locked                                     | Authentication entry flow and protected dashboard shell.                                                  |
| SRY-005  | Locked                                     | Wedding project creation and setup fields (M0004).                                                        |
| SRY-006  | Locked                                     | Private invitation draft contract and content safety guard (M0005–M0006).                                 |
| SRY-007  | Superseded                                 | Initial owner preview foundation; later preview work remains governed by newer baselines.                 |
| SRY-008  | Locked                                     | Published invitation snapshot/runtime foundation (M0007).                                                 |
| SRY-009  | Locked                                     | Private gallery media and public snapshot media runtime (M0008).                                          |
| SRY-010  | Locked                                     | Midtrans payment-attempt foundation (M0009).                                                              |
| SRY-011A | Locked                                     | Verified payment webhook/state transition foundation (M0010).                                             |
| SRY-011B | Locked                                     | Payment-gated publication authority (M0011).                                                              |
| SRY-012  | Locked                                     | Private Guest Manager foundation (M0012).                                                                 |
| SRY-013  | Locked                                     | Personal guest links and personal RSVP foundation (M0013).                                                |
| SRY-014  | Locked                                     | CSV guest import/export.                                                                                  |
| SRY-015  | Locked                                     | Production hardening and private-runtime safeguards.                                                      |
| SRY-016  | Locked                                     | Owner invitation editor foundation.                                                                       |
| SRY-017  | Locked                                     | Manual WhatsApp sharing handoff foundation.                                                               |
| SRY-018  | Locked                                     | Invitation editor polish.                                                                                 |
| SRY-019  | Locked                                     | Landing conversion layer.                                                                                 |
| SRY-019A | Locked                                     | Landing above-the-fold micro repair.                                                                      |
| SRY-020  | Locked                                     | Owner RSVP analytics dashboard.                                                                           |
| SRY-021  | Audit-only                                 | Dashboard request/performance waterfall audit.                                                            |
| SRY-021A | Locked                                     | Private dashboard request-context dedupe.                                                                 |
| SRY-021B | Locked                                     | Preview and gallery loader narrowing.                                                                     |
| SRY-022  | Locked                                     | Optional owner-managed guest WhatsApp contact and recipient handoff (M0014).                              |
| SRY-023  | Locked                                     | Dashboard navigation prefetch suppression.                                                                |
| SRY-024  | Locked                                     | Private dashboard verified-claims alignment.                                                              |
| SRY-025  | Locked                                     | Template key, gallery, and invitation runtime foundation (M0015).                                         |
| SRY-026  | Audit-only                                 | Historical public-cache compatibility work is not separately represented by a migration in this baseline. |
| SRY-027  | Locked                                     | Private personal guestbook / Ucapan & Doa (M0016).                                                        |
| SRY-028  | Locked                                     | RSVP attendee-count contract (M0017).                                                                     |
| SRY-029  | Locked                                     | Guest Invitation Delivery Center V1.                                                                      |
| SRY-030  | Locked                                     | Multi-Event Schedule V1.                                                                                  |
| SRY-031  | Superseded                                 | Wedding Readiness Center and conditional navigation foundation.                                           |
| SRY-032  | Superseded                                 | Invitation composition slot foundation; superseded by SRY-033.                                            |
| SRY-033  | Accepted / Locked with deferred validation | Generic–personal composition correction; current authoritative implementation baseline.                   |
| SRY-034  | Proposed / specification only              | Repository documentation parity release; not an implementation baseline until accepted separately.        |

## Status vocabulary

| Status                                     | Meaning                                                                                                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Locked                                     | Accepted implementation baseline or historical locked milestone.                                                                                          |
| Accepted / Locked with deferred validation | Accepted baseline with a specifically recorded validation item still deferred; it is not a failed release and the deferred item is not treated as passed. |
| Audit-only                                 | Evidence/analysis release with no implementation baseline created.                                                                                        |
| Proposed / specification only              | Approved direction or planned work that is not yet an accepted implementation baseline.                                                                   |
| Superseded                                 | Earlier baseline replaced for current implementation authority by a later locked baseline.                                                                |

## Reading older documentation

Older `docs/sry-*.md` files are retained as historical implementation notes. When an older note
conflicts with this ledger, the current Locked baseline and this ledger govern.
