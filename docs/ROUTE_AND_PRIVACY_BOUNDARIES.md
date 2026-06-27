# Seraya Route & Privacy Boundaries

This document defines the route classes and non-negotiable privacy boundaries for the current
SRY-033 locked baseline.

## Public invitation

### `/{slug}`

The generic invitation is a public, informational invitation.

- Reads the current published invitation snapshot only; it does not read the live owner draft.
- Is snapshot-only and cacheable/static according to the existing runtime contract.
- Contains no guest identity, party size, WhatsApp number, token, delivery state, payment data, or
  response analytics.
- Contains no personal greeting, RSVP form, Guestbook form, RSVP CTA, disabled RSVP state, or
  guest lookup.
- When the published invitation has RSVP enabled, the selected template may render at most one
  quiet, noninteractive closing-adjacent note explaining that confirmation and greetings are sent
  through a personal invitation.
- The quiet note is not a button, link, input, form, analytics container, or request-link CTA.

Public media is served only through its existing public media contract. Do not introduce direct
storage URLs or guest-aware media behavior on this route.

## Personal invitation

### `/{slug}/g/{guestToken}`

The personal invitation is the official private invitation for one authorized guest party.

- Authorization is performed by the existing personal guest-token resolver before personal slots
  are constructed.
- Uses published snapshot content plus the minimal authorized personal context needed for the
  greeting, RSVP, and Guestbook experience.
- Is private and uses the existing no-store, no-referrer, and noindex/nofollow/noarchive runtime
  contract.
- Shows a personal greeting near the opening of the selected template.
- Shows personal RSVP when that published invitation has RSVP enabled.
- Shows personal Guestbook / Ucapan & Doa through the existing private capability flow.
- Never exposes the raw token, token hash, raw personal URL, full WhatsApp number, guest ID,
  other guests, delivery state, payment data, or owner-private dashboard data.

Invalid, revoked, expired, or otherwise unauthorized tokens must follow the existing unavailable /
not-found contract without confirming whether a guest or invitation exists.

### Personal mutation routes

- `/{slug}/g/{guestToken}/rsvp` handles the existing personal RSVP submission contract.
- `/{slug}/g/{guestToken}/guestbook` handles the existing personal Guestbook submission contract.

These routes remain private capability endpoints. They are not generic public response routes.

## Owner routes

### `/dashboard/*`

Owner routes are authenticated and owner-scoped.

- Project data is available only after existing owner authorization.
- Invitation editing, preview, guest management, delivery, RSVP summary, Guestbook inbox, gallery,
  billing, and project readiness remain private owner experiences.
- Owner preview uses the saved private draft and must never receive guest-private personal slots.

## Renderer-surface guardrails

The invitation renderer has three render surfaces:

| Surface    | Allowed content                                                                   |
| ---------- | --------------------------------------------------------------------------------- |
| `generic`  | Public published invitation content only. Personal slots must be ignored.         |
| `preview`  | Owner draft invitation content only. Personal slots must be ignored.              |
| `personal` | Published invitation content plus opaque, authorized personal presentation slots. |

`InvitationViewModel` remains public invitation content only. Personal data belongs only to the
personal route and authorized personal slot components.

## Non-negotiable guardrails

- Never place guest data inside published snapshots.
- Never expose personal tokens in generic public pages, metadata, logs, or links.
- Never add RSVP or Guestbook controls to generic routes.
- Never pass personal presentation slots into generic or preview surfaces.
- Never use a generic public route to discover a guest, party, personal invitation, or response
  state.
- Never replace the existing token resolver, token hashing, expiry, revocation, or personal header
  contracts with client-side logic.
- Keep generic cacheability and personal no-store behavior separate.
