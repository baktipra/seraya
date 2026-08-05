# SERAYA — V4J Invitation Atmosphere & Couple Identity V1

## Baseline

V4J starts from merged V4I commit `2418a307f013aa941b854feaf9c8b642c95d1642`.

## Existing boundaries confirmed

- Couple identity currently contains display name, full name, and parent line for each partner.
- Opening content currently contains hero eyebrow, title, and subtitle.
- Public rendering is mapped through the invitation view model and contains no guest capability data.
- Media storage is private and currently accepts only `gallery_image` assets with JPEG, PNG, or WebP MIME types.
- Published media is exposed only through application routes after current-snapshot validation.

## Implementation order

### Slice A — Couple Identity & Opening Foundation

- Add a backward-compatible `atmosphere` document with safe disabled defaults.
- Keep legacy V4I drafts and snapshots parseable without mutation.
- Add owner controls for opening message, optional quote, and opening treatment.
- Map atmosphere data only through the public invitation view model.
- Compose template-native opening treatments for Roselle, Aruna, and Laras.
- Preserve generic/personal privacy and RSVP/guestbook composition boundaries.

### Slice B — Audio Media Foundation

- Add a dedicated audio media kind without weakening gallery image validation.
- Keep the storage bucket private.
- Accept only supported audio MIME types and bounded file sizes.
- Store validated duration and rights acknowledgement metadata.
- Verify ownership and readiness before draft save and publication.
- Reject arbitrary external audio URLs.

### Slice C — Guest Playback & Atmosphere

- Require guest interaction before playback.
- Never force autoplay.
- Provide persistent play/mute state and accessible status text.
- Keep preview, generic, and personal invitation surfaces behaviorally aligned.
- Fall back cleanly when audio is missing, unavailable, or unsupported.

## Validation contract

- legacy V4I draft/snapshot compatibility tests
- schema/default/editor serialization tests
- public view-model privacy tests
- Roselle, Aruna, and Laras renderer tests
- media ownership/readiness/publish tests
- formatting, lint, typecheck, production build
- invitation experience browser regression

## Non-goals

- streaming-service integration
- external music catalog search
- automatic copyright licensing
- autoplay workarounds
- guest-specific audio or opening content
- public storage bucket
