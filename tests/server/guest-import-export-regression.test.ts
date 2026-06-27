import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');

describe('SRY-014 / SRY-022 / SRY-036 guest import scope regression guards', () => {
  it('keeps the M0014 private-contact migration isolated and makes ExcelJS the only direct spreadsheet dependency', async () => {
    const migrationFiles = await readdir(path.join(repositoryRoot, 'supabase/migrations'));
    const packageManifest = JSON.parse(
      await readFile(path.join(repositoryRoot, 'package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string> };

    expect(migrationFiles).toContain(
      '20260621001400_m0014_add_guest_whatsapp_contact_foundation.sql',
    );
    expect(packageManifest.dependencies?.exceljs).toBe('4.4.0');
    expect(packageManifest.dependencies).not.toHaveProperty('csv-parse');
    expect(packageManifest.dependencies).not.toHaveProperty('papaparse');
    expect(packageManifest.dependencies).not.toHaveProperty('fast-csv');
  });

  it('keeps CSV headers and contact data out of the legacy CSV import/export contract', async () => {
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

  it('keeps XLSX concern owner-only and out of public invitation and personal RSVP routes', async () => {
    const [publicInvitation, personalRsvp, personalInvitation, xlsxRoute] = await Promise.all([
      readFile(path.join(repositoryRoot, 'src/app/[slug]/page.tsx'), 'utf8'),
      readFile(path.join(repositoryRoot, 'src/app/[slug]/g/[guestToken]/rsvp/route.ts'), 'utf8'),
      readFile(path.join(repositoryRoot, 'src/app/[slug]/g/[guestToken]/page.tsx'), 'utf8'),
      readFile(
        path.join(
          repositoryRoot,
          'src/app/(dashboard)/dashboard/[projectId]/guests/template/route.ts',
        ),
        'utf8',
      ),
    ]);

    expect(publicInvitation).not.toMatch(
      /guest-import|guest-csv|guest-xlsx|guests\/export|guests\/template|whatsapp_phone_e164/i,
    );
    expect(personalRsvp).not.toMatch(
      /guest-import|guest-csv|guest-xlsx|guests\/export|guests\/template|whatsapp_phone_e164/i,
    );
    expect(personalInvitation).not.toMatch(/whatsapp_phone_e164|guest contact|guest-xlsx/i);
    expect(xlsxRoute).toContain("export const dynamic = 'force-dynamic'");
    expect(xlsxRoute).toContain('private, no-store, max-age=0');
  });
});
