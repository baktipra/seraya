#!/usr/bin/env bash
set -euo pipefail

scope=(
  src/components/personal-invitation/personal-guest-rsvp.tsx
  src/modules/invitation-templates/__tests__/personal-response-contract.test.tsx
  src/modules/invitation-templates/__tests__/invitation-template-renderer.test.tsx
  src/modules/invitation-templates/aruna/aruna-template.tsx
  src/modules/invitation-templates/laras/laras-template.tsx
  src/modules/invitation-templates/roselle/roselle-template.tsx
  tests/server/personal-guest-invitation-route.test.tsx
)

npx prettier --check "${scope[@]}"
npx eslint "${scope[@]}"
npm run test -- \
  src/modules/invitation-templates/__tests__/personal-response-contract.test.tsx \
  src/modules/invitation-templates/__tests__/invitation-template-renderer.test.tsx \
  tests/server/personal-guest-invitation-route.test.tsx
npm run build
