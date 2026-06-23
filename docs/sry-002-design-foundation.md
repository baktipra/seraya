# SRY-002 — Seraya Design Foundation

## Accepted scope

- Semantic color roles alongside Seraya raw palette references.
- Global typography roles for editorial display, headings, body, and captions.
- Shared spacing, radius, and shadow token exports.
- Base primitives: `Button`, `Input`, `Card`, `Badge`, `Dialog`, and `Toast`.
- Global `ToastProvider` mounted at the app root.
- Accessibility baseline for focus states, reduced motion, touch targets, and public component feedback.

## Core direction

> Romantic Clarity — wedding warmth with product-level confidence.

The foundation uses warm ivory, deep ink, and rosewood as the primary identity. Product components consume semantic roles such as `actionPrimary`, `textPrimary`, and `surface` rather than treating raw palette values as business-level styling decisions.

## Public exports

```ts
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardStat,
  CardTitle,
  Dialog,
  Input,
  ToastProvider,
  useToast,
} from '@/design-system';
```

Token references are available from the same module:

```ts
import {
  semanticColorTokens,
  serayaPalette,
  spacingTokens,
  typographyTokens,
} from '@/design-system';
```

## Deliberate exclusions

- Dashboard layout or navigation.
- Invitation-builder UI.
- Wedding template composition.
- Template ornaments, gallery patterns, or public invitation components.
- Database, auth, payment, or guest operations.
- Custom CSS, HTML, or font uploads.

## Usage rules

- Prefer semantic Tailwind color classes such as `bg-seraya-surface`, `text-seraya-text-primary`, and `bg-seraya-action-primary`.
- Use raw palette classes only when defining a new semantic role or controlled decorative expression.
- Keep one visual primary action per screen.
- Do not use a dialog or toast for routine informational clutter.
- Do not add a new primitive before confirming it is reusable across at least two product surfaces.
