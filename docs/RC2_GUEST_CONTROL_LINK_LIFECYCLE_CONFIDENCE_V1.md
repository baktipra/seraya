# SERAYA — RC2 Guest Control & Link Lifecycle Confidence V1

## Goal

After an invitation is published, the owner must understand the condition of the guest directory and personal-link access without confusing access lifecycle with delivery or engagement tracking.

## Canonical authority

RC2 does not create another guest-link state machine. It reuses the existing canonical lifecycle:

- `not_created`
- `active_recoverable`
- `active_legacy`
- `revoked`
- `expired`

The Tamu workspace remains the authority for create, re-access, replace, and revoke actions. Ringkasan receives aggregate-only counts.

## Ringkasan confidence

Published projects show one additional confidence surface with:

- active guest count;
- active links that can be managed again;
- guests who have never had a personal link;
- legacy, revoked, or expired links that need attention;
- one quiet handoff to the Tamu workspace.

The surface explicitly states that republishing invitation content does not replace active personal links.

## Privacy and truth boundaries

The readiness projection contains no:

- raw personal URL;
- token hash or encrypted token;
- guest name;
- WhatsApp number;
- RSVP row;
- sent, delivered, opened, or read claim.

RC2 adds no database migration, readiness query, or persisted lifecycle field. The existing three-operation readiness batch remains the data source.

## Validation contract

- focused formatting and ESLint;
- TypeScript;
- RC2 and RC1 unit contracts;
- production build;
- desktop and mobile Chromium smoke;
- no horizontal overflow;
- one canonical post-publish focus CTA remains intact.
