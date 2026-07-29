# J2 — Live Cross-Template Production Evidence V1

Status: Implemented / pending owner review  
Evidence date: 2026-07-29  
Production commit: `c2f03ae302bc0eec4e2fcac1795ff437b73f557a`  
Production origin: `https://seraya-delta.vercel.app`

## Objective

Provide controlled, repeatable production evidence that every canonical invitation template renders through the real generic and personal routes without weakening the existing publication, privacy, RSVP, Guestbook, or guest-link boundaries.

## Fixture matrix

| Template | Generic slug | Couple | Personal guest | Generic | Personal |
| --- | --- | --- | --- | --- | --- |
| Roselle | `seraya-evidence-roselle` | Mira & Arga | Tamu Audit Roselle | PASS | PASS |
| Aruna | `seraya-evidence-aruna` | Nadia & Raka | Tamu Audit Aruna | PASS | PASS |
| Laras | `seraya-evidence-laras` | Alya & Dimas | Tamu Audit Laras | PASS | PASS |

All fixture content is fictitious and exists only for controlled production verification.

## Public evidence URLs

- `https://seraya-delta.vercel.app/seraya-evidence-roselle`
- `https://seraya-delta.vercel.app/seraya-evidence-aruna`
- `https://seraya-delta.vercel.app/seraya-evidence-laras`

The personal URLs are capability-bearing and are deliberately excluded from this repository. Supply their tokens only through the following environment variables when running the verifier:

- `J2_ROSELLE_GUEST_TOKEN`
- `J2_ARUNA_GUEST_TOKEN`
- `J2_LARAS_GUEST_TOKEN`

Recorded SHA-256 fingerprints for operator comparison:

- Roselle: `e027724bc9bbd194b9624aded50c027f99f5fe5c81b003392d4204ee965c6ed1`
- Aruna: `7c42bba28aeb22f158c0626908121e381aece11eb60ef05d6f983800ff486c92`
- Laras: `bceea34dd4ed0e76829748bdfe308d18bd2ff0df70d8ce83d783c6ed3e3ae379`

## Assertions verified on production

### Generic surface

For each template, the production route returned HTTP 200 and:

- rendered `data-surface="generic"` with the expected template key;
- rendered the expected fictitious couple identity;
- included exactly the generic response handoff note;
- did not render the personal greeting;
- did not render the personal response journey;
- did not render RSVP or Guestbook controls.

### Personal surface

For each template, the production capability route returned HTTP 200 and:

- rendered `data-surface="personal"` with the expected template key;
- rendered the expected fictitious guest greeting;
- rendered the personal response journey;
- rendered RSVP controls with party size 2 and pending state;
- rendered the Guestbook form;
- did not render the generic response handoff note.

### Personal-route headers

Each personal response included:

- `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`;
- `X-Robots-Tag: noindex, nofollow, noarchive`;
- `Referrer-Policy: no-referrer`;
- `X-Content-Type-Options: nosniff`.

## Runtime and data boundaries

- No route bypass, hard-coded fixture branch, or special production rendering path was added.
- Generic evidence resolves through the current published-snapshot repository.
- Personal evidence resolves through the existing anonymous capability RPC.
- No schema, migration, RLS, function, trigger, or storage change was made.
- No payment or publication authority changed.
- No RSVP or Guestbook semantics changed.
- No existing guest link was replaced.
- The canonical `seraya-demo` fixture was not modified.
- Evidence guest links intentionally contain only active token hashes. They have no ciphertext/key version and therefore are not recoverable through owner delivery tooling.
- Raw capability tokens must not be committed, logged, pasted into PR discussions, or added to public workflow configuration.

## Repeatable verification

Run the full six-route audit with capability tokens supplied only in the process environment:

```bash
J2_ROSELLE_GUEST_TOKEN="..." \
J2_ARUNA_GUEST_TOKEN="..." \
J2_LARAS_GUEST_TOKEN="..." \
npm run audit:j2:live-evidence
```

Public generic routes can be checked without capability material:

```bash
node scripts/audit-live-cross-template-evidence.mjs --generic-only
```

Use `J2_BASE_URL` to point the verifier at another deployment when required.

## Operational note

These are live production evidence fixtures. The personal routes can accept RSVP and Guestbook submissions. Keep capability URLs within controlled audit use and reset the fixture guest state before relying on a subsequent baseline comparison.