# SERAYA — V4J Invitation Atmosphere & Couple Identity V1

Status: Implementation in progress
Baseline: V4I merge `2418a307f013aa941b854feaf9c8b642c95d1642`
Branch: `feature/v4j-invitation-atmosphere-couple-identity-v1`

## Slice A — Couple Identity & Opening Foundation

Status: Implemented / validated

Delivered:

- backward-compatible `opening` contract with safe defaults;
- opening message, optional quote, and soft/editorial/ceremonial treatment;
- backward-compatible `coupleIdentity` contract;
- optional monogram with initials, joined initials, or wordmark styles;
- short couple name and wedding hashtag;
- HTTPS Instagram, TikTok, and website profile links;
- official-host validation for Instagram and TikTok;
- owner controls inside existing Pembuka and Mempelai chapters;
- public-safe invitation view-model mapping;
- template-native opening and identity footer composition for Roselle, Aruna, and Laras;
- Laras crest reuses the configured monogram without rendering a duplicate opening monogram;
- legacy V4I drafts and snapshots remain renderable without migration.

Validation evidence:

- formatting passed;
- ESLint passed;
- TypeScript passed;
- four focused Slice A tests passed;
- production build passed;
- cross-template invitation browser regression passed.

## Slice B — Audio Media Foundation

Status: Pending

- dedicated private audio media kind;
- bounded MP3/M4A validation;
- duration and rights acknowledgement;
- ownership and readiness verification;
- no arbitrary external audio URLs.

## Slice C — Guest Playback & Atmosphere

Status: Pending

- guest-initiated playback only;
- persistent accessible play/mute control;
- preview, generic, and personal parity;
- graceful unavailable-audio fallback.

V4J remains a draft release until Slice B and Slice C are completed and validated.
