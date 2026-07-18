# Roselle Flagship Invitation Experience + Editor Workspace Blueprint V1

## Status

- Status: **Proposed / blueprint only**
- Date: 2026-07-18
- Source baseline: `baktipra/seraya` `main` at `605329ae27f1719c7e59b2d28131ced946c18292`
- Runtime changes in this document: none
- Database migrations in the planned V1 implementation: none

This blueprint defines one product-quality vertical slice: Roselle as Seraya's flagship invitation
and the owner workspace used to create it. The invitation and editor are one product experience;
neither may be redesigned in isolation.

## 1. Decision summary

Roselle becomes Seraya's default and broadest-market template. Its promise is:

> A quiet romantic letter that guides guests from recognition, to warmth, to practical event
> details, to a personal response, without feeling like a form or a generic landing page.

The owner workspace becomes a focused composition tool:

- one active invitation section at a time
- a persistent section outline with truthful completion state
- a live local mobile preview beside the active editor on wide screens
- explicit server save remains the persistence authority
- no hidden autosave and no implication that local edits are already published
- a focused preview mode without account-level or project-level navigation clutter

The implementation must preserve the existing invitation schema, ownership checks, publication
authority, public snapshot boundary, personal guest-link authorization, and template-owned RSVP /
Guestbook placement.

## 2. Baseline evidence

The blueprint is grounded in the current repository and the owner-provided desktop screenshots.

### Current implementation facts

- `InvitationEditor` is one 1,332-line client component containing the entire seven-section form,
  template picker, event list, digital gift accounts, save state, and publication controls.
- The editor renders every section in one long vertical document.
- Optional section controls do not remove their inactive detail fields from the editing flow.
- Template selection uses schematic mini-previews rather than truthful invitation previews.
- Draft persistence is an explicit server action. Local dirty state is already distinguished from a
  successful save.
- The saved preview route renders a private owner draft through `InvitationTemplateRenderer` with
  `surface="preview"`.
- The preview route is nested inside the regular dashboard and project navigation shells.
- Roselle renders a fixed sequence: hero, personal greeting when authorized, couple, story, events,
  legacy location, gallery, digital gift, personal response or generic response note, and closing.
- Roselle uses the correct typed `InvitationViewModel`; visual templates do not query the database.
- Generic, personal, and preview surfaces are already distinct render contexts.
- Generic and preview surfaces cannot consume personal presentation slots.
- Personal RSVP and Guestbook are injected as opaque presentation slots only after authorized
  personal-link resolution.

### Existing product strengths to preserve

- validated `id-ID` invitation content
- one strict view-model mapping boundary
- public snapshot-only generic invitation
- private, no-store personal invitation route
- template-owned personal greeting and response rhythm
- explicit save status and server validation
- payment-gated publish and republish semantics
- optional gallery failure that omits safely instead of leaking storage detail
- keyboard focus treatment and reduced-motion baseline

## 3. Problem definition

### Guest-facing problem

Roselle is visually consistent but does not yet carry enough emotional or compositional value. The
same centered section pattern, border line, heading treatment, and small card treatment repeat down
the page. Large areas of whitespace do not create anticipation; they mostly lengthen the page.
Event, gallery, and digital-gift content look inserted into a shared skeleton rather than composed
as chapters of a romantic invitation.

### Owner-facing problem

The editor behaves like a complete database form. Owners must scroll through every concern,
remember where each field lives, and leave the page to understand the result. The product asks the
owner to think in schema sections instead of helping them shape a guest journey.

### Preview problem

Preview is visually subordinate to the dashboard shell. Account navigation, project navigation,
preview controls, and the invitation compete in one viewport. The result feels like a document
inside an admin panel instead of the product being created.

## 4. Product goals

### Invitation goals

1. A guest understands the couple and main date within the opening viewport.
2. Roselle feels warm, personal, and contemporary without wedding-template clichés.
3. Each chapter has a distinct compositional role and rhythm.
4. Practical information remains fast to scan and easy to act on.
5. Personal greeting, RSVP, and Guestbook feel native to Roselle rather than embedded app cards.
6. Generic invitation boundaries remain truthful: no RSVP or Guestbook controls.
7. The design works first at 360–430 CSS pixels, the expected WhatsApp guest surface.

### Editor goals

1. An owner works on one decision group at a time.
2. The effect of a local change is visible without navigating away.
3. Saved, unsaved, published, and unpublished states remain impossible to confuse.
4. Optional sections stay quiet until enabled.
5. Required problems are visible both in the active panel and the section outline.
6. Switching templates never deletes or rewrites invitation content.
7. Wide desktop space is used for preview, not decorative gutters.

## 5. Non-goals

This milestone does not add:

- a new invitation schema or database migration
- a dedicated cover-photo field
- drag-and-drop freeform design
- user-selected fonts, colors, spacing, or arbitrary CSS
- background music, autoplay audio, countdown, confetti, or ornamental gimmicks
- automatic WhatsApp delivery
- new guest data or personal-route authority
- public RSVP or Guestbook controls
- autosave persistence
- changes to payment, publish, snapshot, RLS, or guest-link contracts
- redesigns of Aruna or Laras beyond ensuring registry compatibility

## 6. Roselle experience thesis

Roselle is a **romantic correspondence**, not a collection of cards.

Its visual behavior follows four principles:

1. **Warm recognition** — names and date are unmistakable, with restrained botanical detail.
2. **Human closeness** — personal greeting and couple detail arrive early and read naturally.
3. **Calm usefulness** — event and location information is practical without becoming dashboard UI.
4. **Gentle closure** — response, gift, and closing content resolve the journey without competing.

Roselle should remain the most universal template in the collection. Aruna may be more editorial and
Laras more formal, but Roselle must feel like the safest premium choice rather than the simplest
fallback.

## 7. Mobile-first guest journey

| Chapter | Required behavior | Composition direction |
| --- | --- | --- |
| Opening | Couple label/title and primary date visible immediately | Near-full opening viewport, controlled botanical frame, strong editorial names, one quiet scroll cue |
| Personal greeting | Personal surface only, immediately after opening | A letter-like greeting with guest name; no app-card wrapper |
| Couple | Identify both partners and optional family lines | Two balanced portraits made from typography, not boxed profile cards |
| Story | Render only when enabled and meaningful | Short reading measure, pull-quote rhythm, no oversized empty block |
| Events | Present 1–4 events with the first as primary | Date-led schedule sheet or timeline; clear title, time, venue, address, and map action |
| Legacy location | Render only for normalized legacy content | Same practical treatment as events; never create a duplicate-looking chapter |
| Gallery | Make photos the main visual release | Deterministic editorial mosaic based on image count; intentional crops and spacing |
| Digital gift | Optional and visually secondary | Quiet “Hadiah & doa” chapter; compact account disclosure and copy action |
| Personal RSVP | Personal surface only | Roselle-owned response chapter after practical details; attendance choice is the primary action |
| Personal Guestbook | Personal surface only, after RSVP | Continuation of the response chapter, not a second unrelated form card |
| Generic response note | Generic and preview surfaces only when RSVP enabled | One quiet explanatory sentence; never looks interactive |
| Closing | End with gratitude and signature | Distinct closing field with a final botanical gesture and no trailing utility UI |

## 8. Roselle composition specification

### 8.1 Opening

- Target `min-height`: approximately `82svh` on mobile, capped on very tall screens.
- Keep the primary names between 2 and 3 lines at 360px; prevent single-character widows.
- Primary date is always legible without scrolling on common 390×844 screens.
- Use one botanical drawing system with two controlled placements. Do not repeat the same branch in
  every section.
- The decorative inner border becomes an opening-frame device only; it does not continue as a page
  card metaphor.
- No hero photograph is derived implicitly from gallery data in V1.

### 8.2 Personal greeting

- Preserve the opaque authorized slot contract.
- Place it directly after the opening, before general couple content.
- Use an intimate reading width and a subtle letter divider.
- Do not expose guest identity on generic or preview surfaces.

### 8.3 Couple

- Remove the repeated generic section pattern.
- Use one shared heading and two typographic identity columns on tablet/desktop.
- Stack naturally on mobile with the ampersand as a transition, not an isolated decorative object.
- Full names and parent lines use quieter body typography and remain optional without leaving gaps.

### 8.4 Story

- Omit the chapter completely when disabled or empty.
- Cap prose width near 32–36rem and preserve intentional line breaks.
- Long content remains readable; it must not become a full-width wall of text.
- The chapter gets a warmer surface wash or botanical margin detail to distinguish it from Couple.

### 8.5 Events and location

- Replace small isolated event cards with a coherent schedule composition.
- Lead with the primary date once; avoid repeating it as both section date and every-card headline
  unless events occur on different days.
- Each event exposes a clear map action only when a safe HTTPS URL exists.
- Map labels use concise Indonesian copy such as `Buka peta`, with accessible new-tab context.
- One event uses a single full-width schedule sheet; two events use paired chapters; three or four
  use a vertical timeline on mobile and a balanced grid only when space supports it.
- Venue and address hierarchy must be stronger than decorative sequence numbers.

### 8.6 Gallery

- One image: full editorial feature.
- Two images: unequal diptych.
- Three images: one feature plus two supporting crops.
- Four or more: repeatable mosaic with stable aspect ratios; no layout shift.
- Keep source order as owner intent.
- Every image retains meaningful alt text and lazy loading below the fold.
- Do not add borders around every image. Shape and spacing provide composition.

### 8.7 Digital gift

- Rename the presentation chapter to `Hadiah & doa` while preserving the owner-provided heading when
  present.
- Treat accounts as compact details, not large empty cards.
- Copy feedback remains visible and announced.
- Account numbers must wrap safely and never overflow at 320px.
- The section stays visually subordinate to event and personal response content.

### 8.8 Personal response journey

- Preserve the authorized personal slots and existing action semantics.
- RSVP and Guestbook share one continuous Roselle chapter.
- Avoid nested generic cards around each form.
- Attendance options retain large touch targets and explicit selected state.
- Success, validation, and server-error messages remain distinguishable without relying only on
  color.
- The generic/preview response note remains noninteractive and visually quiet.

### 8.9 Closing

- Closing must feel like the final page of a letter.
- Use one final botanical gesture, a gratitude headline, optional message, and signature.
- Do not leave a large empty tail after the signature.

## 9. Roselle visual language

### Color

Retain the current Roselle family as the base:

- ivory canvas
- warm paper
- plum text
- mauve and rose accent
- muted sage botanical accent

Adjustments must improve contrast and rhythm rather than introduce more colors. Each long chapter
may use paper, ivory, or a subtle wash, but bordered white cards must not become the main layout
language.

### Typography

- Roselle receives a template-specific romantic display face rather than sharing only the global
  editorial fallback with every template.
- Preferred implementation direction: self-hosted `Cormorant Garamond` display weights with the
  existing UI sans for supporting copy.
- Font loading must not introduce third-party runtime requests.
- Display typography must tolerate Indonesian names, punctuation, and long venue labels.

### Shape

- Reserve the large rounded frame for the preview device and opening composition.
- Event, gift, and response content should not all reuse the same rounded card.
- Touch actions may remain pill-shaped where the affordance benefits.

### Motion

- Motion is optional and never carries meaning.
- Allow only restrained opacity/translate entrance for the opening and chapter transitions.
- Disable through `prefers-reduced-motion`.
- No scroll-jacking, parallax, autoplay, or delayed access to practical information.

## 10. Editor workspace architecture

### 10.1 Desktop wide layout

At widths of approximately 1280px and above, use three purposeful regions:

| Region | Target width | Responsibility |
| --- | ---: | --- |
| Section rail | 220–248px | Navigation, completion, errors, optional visibility |
| Active editor | 420–520px | Fields for exactly one active section |
| Live preview | 390–460px | Sticky mobile invitation viewport and preview controls |

The workspace may use the remaining width for controlled gutters. It must not remain constrained by
the current dashboard `max-w-5xl` and editor `max-w-4xl` combination.

### 10.2 Medium desktop/tablet

- Section rail becomes a compact horizontal chapter selector or a drawer.
- Active editor remains primary.
- Preview opens as a side sheet or full-height overlay.
- Save status and preview action stay persistent.

### 10.3 Mobile owner workspace

- Show one active editor section.
- Use a top chapter selector showing current position, for example `3 dari 7`.
- Provide previous/next section actions without implying a forced wizard.
- Use one sticky action bar: save status, `Simpan`, and `Preview`.
- Preview opens full screen and returns to the same section and scroll position.

## 11. Section rail contract

The section rail contains:

1. Gaya undangan
2. Pembuka
3. Mempelai
4. Cerita
5. Rangkaian acara
6. Galeri
7. Konfirmasi tamu
8. Amplop Digital
9. Penutup

`Galeri` links to or embeds the existing media-management capability without duplicating upload
authority. It may remain a clear handoff in the first implementation slice if integrating the
manager would expand risk.

Each item has one truthful state:

- `current`
- `complete`
- `incomplete`
- `optional_off`
- `error`

Completion comes from the validated domain/readiness contract, not merely from whether a browser
input is non-empty. Optional-off is a valid settled state, not an error.

## 12. Active editor behavior

- Render only the active section's fields.
- Inactive optional sections do not render editable detail fields.
- Enabling an optional section reveals its fields without deleting preserved content.
- Template selection uses truthful Roselle, Aruna, and Laras mobile snapshots rather than abstract
  bars and rectangles.
- Template switching updates local preview only and never mutates content structure.
- Field help explains guest impact, not database concepts.
- Event ordering uses clear `Pindah ke atas` / `Pindah ke bawah` actions initially; drag-and-drop is
  not required.
- Inline errors appear beside the field and on the matching rail item.
- On failed save, focus moves to an error summary with links to affected sections.

## 13. Local preview and persistence model

### Local preview

- Local form state feeds a client-safe preview adapter.
- The preview may render incomplete local text, but it must never claim that content is saved.
- Gallery assets required for preview are supplied from the already owner-authorized server load.
- Preview uses `surface="preview"`; it cannot receive personal presentation slots.
- Local preview updates should feel immediate, with no full page navigation.

### Server save

- Existing explicit server action remains the only draft persistence path.
- The server still parses and validates the complete invitation document.
- A successful save refreshes authoritative draft/readiness data and clears dirty state.
- A failed save keeps local edits and exposes field/section errors.
- Navigating away with dirty state requires a clear confirmation.

### Publish

- Save does not publish.
- Publish does not occur inside a local-preview interaction.
- Published and unpublished-change states remain sourced from current readiness and snapshot logic.
- Publish/republish controls appear only after a successful authoritative save and existing payment
  eligibility checks.

## 14. Focus preview specification

The saved owner preview becomes a focused product-inspection route:

- remove account-level sidebar and regular project navigation from the inspection viewport
- retain one compact top bar with back, saved/published status, device mode, and edit action
- default to a 390px mobile viewport on desktop
- provide `Mobile` and `Desktop` device modes
- allow a borderless full-canvas mode for visual inspection
- preserve `surface="preview"` and private draft loading
- clearly state when preview differs from the currently published snapshot

The public generic and personal routes remain free of owner controls.

## 15. Information and copy rules

- Use one owner voice consistently. V1 direction: `kalian` for the couple and `Anda` only inside
  formal guest-facing template copy where the template intentionally uses it.
- Prefer Indonesian owner labels: `Proyek` is avoided where `undangan` is clearer.
- Preview dates use Indonesian formatting; browser-native editor controls may retain native input
  behavior, but adjacent summaries use `28 Juni 2026` and 24-hour time.
- Avoid repeating status messages across hero, summary, checklist, and save bar.
- One screen has one primary action.

## 16. Accessibility requirements

- Full keyboard access to rail, editor controls, template selection, preview controls, and save.
- Visible focus remains at least as strong as the existing Seraya focus ring.
- Minimum interactive target: 44×44 CSS pixels.
- Heading hierarchy remains logical when sections are mounted individually.
- Rail state never relies on color alone.
- Error summary announces through an appropriate live region and moves focus only after submit.
- Preview device controls have selected state and accessible names.
- Invitation text and actions meet WCAG AA contrast.
- Reduced-motion preference disables all nonessential transition motion.

## 17. Performance requirements

- Keep the public Roselle renderer mostly server-rendered.
- Do not ship editor-only workspace code to public invitation routes.
- Self-hosted display font is subset and preloaded only where Roselle is rendered.
- Gallery images define dimensions/aspect ratios to avoid layout shift.
- Below-fold gallery images remain lazy.
- Local preview updates are scoped to the preview tree; keystrokes must not rerender unrelated
  dashboard data.
- No new third-party runtime scripts.

## 18. Current-source implementation map

| Current source | Planned responsibility |
| --- | --- |
| `src/components/projects/invitation-editor.tsx` | Decompose into workspace shell, section rail, active-section editors, state reducer, save bar, and preview bridge |
| `src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx` | Load owner-authorized draft, readiness, and preview media required by the workspace |
| `src/app/(dashboard)/dashboard/[projectId]/preview/page.tsx` | Become focused saved-preview inspection route |
| `src/components/dashboard/dashboard-shell.tsx` | Gain an intentional width/shell contract instead of forcing all experiences through one max width |
| `src/components/dashboard/project-navigation.tsx` | Stay canonical for normal project pages; do not compete inside focused editor/preview mode |
| `src/modules/invitation-templates/roselle/roselle-template.tsx` | Preserve renderer order and authorized slots while adopting the new chapter composition |
| `src/modules/invitation-templates/roselle/roselle-sections.tsx` | Split into chapter components with distinct layout behavior |
| `src/modules/invitation-templates/roselle/roselle.module.css` | Replace repeated centered-section/card rhythm with the flagship responsive system |
| `src/modules/invitation-templates/invitation-view-model.ts` | Remain the sole server-safe mapping boundary; extend only if strictly required without personal data |
| `src/modules/invitations/invitation-draft.schema.ts` | Remain unchanged for V1 |
| `src/modules/invitation-templates/invitation-template.types.ts` | Preserve generic/personal/preview and opaque personal-slot contracts |

## 19. Preservation boundaries

The following are release blockers if regressed:

- public generic route remains snapshot-only and contains no guest data
- personal route remains capability-authorized, private, no-store, no-referrer, and non-indexable
- preview never receives personal greeting, RSVP, or Guestbook slots
- generic invitation contains no RSVP/Guestbook container, form, CTA, or disabled state
- personal greeting remains near the opening
- personal RSVP then Guestbook remain near the closing in that order
- raw HTML remains rejected by schema and database protections
- maps URLs remain safe HTTPS only
- gallery media remains owner-authorized in private editor/preview and public-safe in snapshots
- payment-gated publish remains database-authoritative
- explicit save never implies publish
- Aruna and Laras remain functionally compatible with the same view model

## 20. Acceptance criteria

### Roselle product quality

- At 390×844, couple identity and primary date are visible in the opening viewport.
- Roselle has at least four visibly distinct chapter compositions; it is not one repeated centered
  section pattern.
- One, two, three, and four-plus gallery counts produce deliberate stable layouts.
- One through four event counts remain readable without tiny cards or horizontal overflow.
- Optional disabled sections leave no unexplained gaps.
- Gift, generic note, personal RSVP, Guestbook, and closing fit Roselle's visual language.
- The template is clearly distinguishable from Aruna and Laras in grayscale structure as well as
  color.

### Editor experience

- Only one active section is edited at a time.
- Every section is reachable in one action from the rail/selector.
- Optional-off, incomplete, complete, and error states are truthful.
- Unsaved local edits update preview without being represented as saved or published.
- A failed save preserves the owner's inputs.
- Save is persistently reachable on desktop and mobile.
- Leaving with unsaved changes requires confirmation.
- Template switching is nondestructive.

### Preview experience

- Saved preview opens without the regular account sidebar and project navigation.
- Mobile preview is the default desktop inspection mode.
- Mobile/desktop controls do not affect saved content.
- Published versus unpublished-change status is unambiguous.

### Verification

- format, lint, and typecheck pass
- existing invitation schema, renderer, privacy, publication, and personal-response tests pass
- targeted Roselle rendering tests cover every optional chapter and surface
- targeted editor tests cover rail state, local preview, dirty navigation, failed save, successful
  save, template switching, and responsive controls
- production build passes
- controlled live smoke covers owner edit → local preview → save → saved preview → publish/republish
  and one authorized personal invitation response journey

## 21. Implementation slices

### Slice A — Workspace architecture foundation

- Decompose the monolithic editor without changing fields or save behavior.
- Introduce width contract, section rail, active-section routing, and persistent save state.
- Keep current Roselle rendering unchanged in this slice.

### Slice B — Roselle flagship renderer

- Implement the new opening and chapter rhythm.
- Implement responsive event, gallery, gift, response, and closing compositions.
- Add template-specific font assets and visual regression fixtures.

### Slice C — Local live preview bridge

- Introduce structured local editor state.
- Render a client-safe Roselle preview using owner-authorized initial media.
- Preserve explicit server save and error behavior.

### Slice D — Focused saved preview

- Remove competing dashboard chrome from inspection mode.
- Add device controls and authoritative saved/published status.

### Slice E — Integration and release gate

- Run full automated verification.
- Test mobile owner workspace and guest routes.
- Complete controlled Supabase/Vercel smoke before locking the implementation baseline.

Each slice should be independently reviewable and preserve the previous slice's tests. Do not mix
Aruna/Laras redesign, database work, or unrelated dashboard polish into these pull requests.

## 22. Definition of blueprint approval

Approval of this blueprint locks the product direction and preservation boundaries, not the current
visual implementation. Coding begins with Slice A. Roselle is not considered flagship-complete until
Slices A–E pass their acceptance criteria and the owner confirms the live mobile invitation journey.
