import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');

describe('SRY-014 scope regression guards', () => {
  it('adds no M0014 migration and keeps package manifests free of a CSV dependency', async () => {
    const migrationFiles = await readdir(path.join(repositoryRoot, 'supabase/migrations'));
    const packageManifest = await readFile(path.join(repositoryRoot, 'package.json'), 'utf8');
    const packageLock = await readFile(path.join(repositoryRoot, 'package-lock.json'), 'utf8');

    expect(migrationFiles.some((file) => file.includes('0014'))).toBe(false);
    expect(packageManifest).not.toMatch(/csv-parse|papaparse|fast-csv/i);
    expect(packageLock).not.toMatch(/node_modules\/(csv-parse|papaparse|fast-csv)/i);
  });

  it('does not add guest import/export concerns to public invitation or personal RSVP routes', async () => {
    const publicInvitation = await readFile(
      path.join(repositoryRoot, 'src/app/[slug]/page.tsx'),
      'utf8',
    );
    const personalRsvp = await readFile(
      path.join(repositoryRoot, 'src/app/[slug]/g/[guestToken]/rsvp/route.ts'),
      'utf8',
    );

    expect(publicInvitation).not.toMatch(/guest-import|guest-csv|guests\/export/i);
    expect(personalRsvp).not.toMatch(/guest-import|guest-csv|guests\/export/i);
  });
});
