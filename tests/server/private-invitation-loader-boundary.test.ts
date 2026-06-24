import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const privateDraftLoader = 'getOwnedProjectPrivateInvitationDraftForVerifiedProject';

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectSourceFiles(path);
    }

    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe('SRY-021B private invitation loader boundary', () => {
  it('keeps the narrow owner-only draft loader out of public invitation and media routes', () => {
    const publicRouteRoots = [
      join(process.cwd(), 'src/app/[slug]'),
      join(process.cwd(), 'src/app/media'),
    ];

    for (const sourceFile of publicRouteRoots.flatMap(collectSourceFiles)) {
      expect(readFileSync(sourceFile, 'utf8')).not.toContain(privateDraftLoader);
    }
  });
});
