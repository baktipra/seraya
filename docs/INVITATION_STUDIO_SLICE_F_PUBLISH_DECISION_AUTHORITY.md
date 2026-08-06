# Invitation Studio Slice F — Terbitkan Mode & Publication Decision Authority

## Status

Accepted / Locked by owner. Slice F.1 adds validation closure only and does not reopen product scope.

## Canonical authority

Mode **Terbitkan** is the only Studio surface that decides what the owner should do before a version becomes visible to guests.

Decision priority:

1. Save local browser changes.
2. Resolve required readiness blockers.
3. Complete verified payment activation.
4. Publish the first version.
5. Republish a newer saved draft.
6. Open the current published invitation when saved and published versions are synchronized.

Exactly one primary decision is presented at a time.

## Version truth

The surface distinguishes:

- local browser changes;
- the latest private saved draft;
- the immutable current published snapshot and revision.

A republish updates invitation content on existing active links. It does not recreate guest links or guest tokens and does not claim that invitations were sent, opened, or read.

## Preserved boundaries

Slice F keeps the existing:

- `publishInvitationAction` server action;
- owner and payment authorization checks;
- Midtrans activation flow;
- immutable publication snapshot contract;
- public generic and private personal routes;
- guest-link lifecycle;
- single Studio Header save authority.

No schema or Supabase migration is introduced.

## Slice F.1 validation closure

The permanent validation gate proves:

- all six publication decision states;
- dirty-state priority over readiness and publication actions;
- readiness and payment handoffs;
- first-publish and republish confirmation copy;
- published revision truth after the publication state refreshes;
- one primary publication decision;
- no publication decision surface inside Mode Isi;
- desktop and mobile horizontal-overflow safety;
- publication service and immutable snapshot compatibility.

The temporary Slice F bootstrap workflow is removed before final validation.
