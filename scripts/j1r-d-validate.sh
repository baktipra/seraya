#!/usr/bin/env bash
set -euo pipefail

npx prettier --write \
  src/app/layout.tsx \
  src/app/personal-response-release.css \
  src/modules/invitation-templates/__tests__/personal-response-visual-state-contract.test.ts

mkdir -p public/__j1r-d
cp src/app/personal-response-release.css public/__j1r-d/personal-response-release.css.txt
cp src/modules/invitation-templates/__tests__/personal-response-visual-state-contract.test.ts \
  public/__j1r-d/personal-response-visual-state-contract.test.ts.txt

npx prettier --check \
  src/app/layout.tsx \
  src/app/personal-response-release.css \
  src/modules/invitation-templates/__tests__/personal-response-visual-state-contract.test.ts

npx eslint \
  src/app/layout.tsx \
  src/modules/invitation-templates/__tests__/personal-response-visual-state-contract.test.ts

npm test -- \
  src/modules/invitation-templates/__tests__/personal-response-visual-state-contract.test.ts \
  src/modules/invitation-templates/__tests__/personal-response-contract.test.tsx

npm run build
