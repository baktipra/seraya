import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');

describe('SRY-014 / SRY-022 guest CSV scope regression guards', () => {
  it('keeps the M0014 private-contact migration isolated and package manifests free of a CSV dependency', async () => {
    const migrationFiles = await readdir(path.join(repositoryRoot, 'supabase/migrations'));
    const packageManifest = await readFile(path.join(repositoryRoot, 'package.json'), 'utf8');
    const packageLock = await readFile(path.join(repositoryRoot, 'package-lock.json'), 'utf8');

    expect(migrationFiles).toContain(
      '20260621001400_m0014_add_guest_whatsapp_contact_foundation.sql',
    );
    expect(packageManifest).not.toMatch(/csv-parse|papaparse|fast-csv/i);
    expect(packageLock).not.toMatch(/node_modules\/(csv-parse|papaparse|fast-csv)/i);
  });

  it('keeps CSV headers and contact data out of the import/export contract', async () => {
    const [csvSource, exportRoute] = await Promise.all([
      readFile(path.join(repositoryRoot, 'src/modules/guests/guest-csv.ts'), 'utf8'),
      readFile(
        path.join(
          repositoryRoot,
          'src/app/(dashboard)/dashboard/[projectId]/guests/export/route.ts',
        ),
        'utf8',
      ),
    ]);

    expect(csvSource).toContain("['display_name', 'group_label', 'party_size']");
    expect(csvSource).not.toContain('whatsapp_phone_e164');
    expect(csvSource).not.toContain('whatsappPhoneE164');
    expect(exportRoute).not.toContain('whatsapp');
  });

  it('does not add guest import/export or guest contact concerns to public invitation or personal RSVP routes', async () => {
    const [publicInvitation, personalRsvp, personalInvitation] = await Promise.all([
      readFile(path.join(repositoryRoot, 'src/app/[slug]/page.tsx'), 'utf8'),
      readFile(path.join(repositoryRoot, 'src/app/[slug]/g/[guestToken]/rsvp/route.ts'), 'utf8'),
      readFile(path.join(repositoryRoot, 'src/app/[slug]/g/[guestToken]/page.tsx'), 'utf8'),
    ]);

    expect(publicInvitation).not.toMatch(
      /guest-import|guest-csv|guests\/export|whatsapp_phone_e164/i,
    );
    expect(personalRsvp).not.toMatch(/guest-import|guest-csv|guests\/export|whatsapp_phone_e164/i);
    expect(personalInvitation).not.toMatch(/whatsapp_phone_e164|guest contact/i);
  });
});
